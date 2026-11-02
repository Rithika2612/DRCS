import {auth,db} from "./firebase.js";
import {onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {collection,doc,getDoc,onSnapshot} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const $=id=>document.getElementById(id);
const state={disasters:[],requests:[],hospitals:[],hospitalResources:[],points:[],resolved:[],unmapped:[]};
const unsubscribers=[];
const geocodeCache=new Map();
const geocodePending=new Map();
let map;
let markerLayer;
let geocodeRun=0;
let rebuildTimer;
const colours={disaster:"#dc3f4f",request:"#e38b17",hospital:"#2563eb",ngo:"#16855b"};
const labels={disaster:"Disaster",request:"Help request",hospital:"Hospital",ngo:"Distribution point"};
const knownPlaces={
    chennai:[13.0827,80.2707],coimbatore:[11.0168,76.9558],madurai:[9.9252,78.1198],
    tiruchirappalli:[10.7905,78.7047],trichy:[10.7905,78.7047],salem:[11.6643,78.1460],
    tiruppur:[11.1085,77.3411],erode:[11.3410,77.7172],thanjavur:[10.7870,79.1378],
    vellore:[12.9165,79.1325],thoothukudi:[8.7642,78.1348],tuticorin:[8.7642,78.1348],
    kanchipuram:[12.8342,79.7036],cuddalore:[11.7480,79.7714],dindigul:[10.3673,77.9803],
    nagercoil:[8.1833,77.4119],hosur:[12.7409,77.8253],pollachi:[10.6573,77.0107],
    mettupalayam:[11.2996,76.9349],gandhipuram:[11.0183,76.9674],
    tambaram:[12.9249,80.1000],avadi:[13.1067,80.0970],koyambedu:[13.0694,80.1948],
    velachery:[12.9815,80.2180],perambur:[13.1210,80.2326]
};
const normalise=value=>String(value??"").trim().toLowerCase();
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
const title=value=>String(value??"").replace(/[-_]/g," ").replace(/\b\w/g,char=>char.toUpperCase());

function showMessage(text="",type=""){
    $("pageMessage").textContent=text;
    $("pageMessage").className=`message ${type}`.trim();
}

function initialiseMap(){
    if(typeof L==="undefined"){
        showMessage("The map library could not load. Records will still appear in the location list. Check your internet connection and refresh.","error");
        return false;
    }
    map=L.map("map",{zoomControl:true}).setView([20.5937,78.9629],5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
        maxZoom:19,
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    markerLayer=L.layerGroup().addTo(map);
    return true;
}

function coordinates(record){
    const sources=[
        [record.latitude,record.longitude],
        [record.lat,record.lng],
        [record.location?.latitude,record.location?.longitude],
        [record.location?.lat,record.location?.lng],
        [record.coordinates?.latitude,record.coordinates?.longitude],
        [record.coordinates?.lat,record.coordinates?.lng],
        [record.geoPoint?.latitude,record.geoPoint?.longitude]
    ];
    for(const pair of sources){
        const lat=Number(pair[0]),lng=Number(pair[1]);
        if(Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180)return[lat,lng];
    }
    return null;
}

function locationText(record){
    const raw=typeof record.location==="string"?record.location:"";
    return [raw,record.address,record.city,record.landmark].filter(Boolean).join(", ");
}

function knownCoordinates(record){
    const text=normalise(`${record.city||""} ${locationText(record)}`);
    for(const [place,value] of Object.entries(knownPlaces)){
        if(text.includes(place))return value;
    }
    return null;
}

/*
 * Several records can legitimately use the same city coordinate. Rendering
 * them at the exact same point makes Leaflet stack the markers, leaving only
 * the last marker visible. Spread records that share a coordinate around the
 * real point so every loaded record remains selectable and keeps its own type.
 */
function spreadOverlappingMarkers(items){
    const groups=new Map();
    for(const item of items){
        const key=`${item.coords[0].toFixed(5)},${item.coords[1].toFixed(5)}`;
        if(!groups.has(key))groups.set(key,[]);
        groups.get(key).push(item);
    }
    const spread=[];
    for(const group of groups.values()){
        if(group.length===1){
            spread.push(group[0]);
            continue;
        }
        group.forEach((item,index)=>{
            const ring=Math.floor(index/10);
            const position=index%10;
            const itemsInRing=Math.min(10,group.length-ring*10);
            const angle=(Math.PI*2*position/itemsInRing)+(ring*Math.PI/10);
            const radius=.012+(ring*.009);
            const latitude=item.coords[0]+Math.sin(angle)*radius;
            const longitude=item.coords[1]+Math.cos(angle)*radius/
                Math.max(Math.cos(item.coords[0]*Math.PI/180),.35);
            spread.push({...item,coords:[latitude,longitude],actualCoords:item.coords});
        });
    }
    return spread;
}

function markerIcon(type){
    const letter={disaster:"!",request:"+",hospital:"H",ngo:"N"}[type];
    return L.divIcon({className:"",html:`<div class="map-marker ${type}"><span>${letter}</span></div>`,iconSize:[32,32],iconAnchor:[16,31],popupAnchor:[0,-30]});
}

function toItems(){
    const visibleDisasters=state.disasters.filter(item=>!["rejected","closed","resolved"].includes(normalise(item.status))).map(item=>({
        ...item,type:"disaster",name:title(item.disasterType||"Disaster"),place:locationText(item),
        detail:item.description||"Citizen disaster report",status:item.status||"pending"
    }));
    const activeRequests=state.requests.filter(item=>!["completed","closed","rejected"].includes(normalise(item.status))).map(item=>({
        ...item,type:"request",name:title(item.requestType||item.type||"Help request"),place:locationText(item),
        detail:item.description||"Citizen assistance request",status:item.status||"pending"
    }));
    const resourceById=new Map(state.hospitalResources.map(item=>[item.id,item]));
    const hospitals=state.hospitals.map(item=>{
        const resource=resourceById.get(item.id)||{};
        return {...resource,...item,type:"hospital",name:item.hospitalName||item.name||resource.hospitalName||"Hospital",
            place:locationText({...resource,...item}),detail:`Beds: ${resource.availableBeds??"—"} · ICU: ${resource.availableIcuBeds??resource.icuBeds??"—"}`,status:"active"};
    });
    const points=state.points.filter(item=>item.active!==false).map(item=>({
        ...item,type:"ngo",name:item.name||"Distribution point",place:locationText(item),
        detail:[item.ngoName,item.timings].filter(Boolean).join(" · ")||"NGO resource distribution point",status:"active"
    }));
    return[...visibleDisasters,...activeRequests,...hospitals,...points];
}

async function geocode(place){
    const key=normalise(place);
    if(!key)return null;
    if(geocodeCache.has(key))return geocodeCache.get(key);
    if(geocodePending.has(key))return geocodePending.get(key);
    const request=(async()=>{
      try{
        const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(place)}`;
        const response=await fetch(url,{headers:{"Accept":"application/json"},signal:AbortSignal.timeout(8000)});
        if(!response.ok)throw new Error("Location lookup failed");
        const result=(await response.json())[0];
        const value=result?[Number(result.lat),Number(result.lon)]:null;
        geocodeCache.set(key,value);
        return value;
      }catch(error){
        console.warn("Could not resolve location:",place,error);
        geocodeCache.set(key,null);
        return null;
      }finally{geocodePending.delete(key)}
    })();
    geocodePending.set(key,request);
    return request;
}

function scheduleRebuild(){
    clearTimeout(rebuildTimer);
    rebuildTimer=setTimeout(rebuildRecords,120);
}

function rebuildRecords(){
    const run=++geocodeRun;
    const items=toItems();
    const resolved=[];
    const unresolved=[];
    for(const item of items){
        const coords=coordinates(item)||knownCoordinates(item)||(item.place?geocodeCache.get(normalise(item.place)):null);
        (coords?resolved:unresolved).push({...item,coords});
    }
    state.resolved=spreadOverlappingMarkers(resolved);
    state.unmapped=unresolved;
    updateCounts(items);
    render();
    const lookups=[...new Map(unresolved.filter(item=>item.place&&!geocodeCache.has(normalise(item.place))).map(item=>[normalise(item.place),item.place])).values()];
    if(lookups.length){
        showMessage(`Showing saved coordinates. Resolving ${lookups.length} text location${lookups.length===1?"":"s"} in the background…`);
        Promise.allSettled(lookups.map(place=>geocode(place))).then(()=>{
            if(run===geocodeRun){
                showMessage("");
                rebuildRecords();
            }
        });
    }else if(!geocodePending.size)showMessage("");
}

function updateCounts(items){
    for(const type of Object.keys(labels))$(`${type==="ngo"?"point":type}Count`).textContent=items.filter(item=>item.type===type).length;
    $("unmappedCount").textContent=state.unmapped.length;
    $("unmappedPanel").classList.toggle("hidden",state.unmapped.length===0);
    $("unmappedList").innerHTML=state.unmapped.map(item=>`<li><strong>${esc(item.name)}</strong> — ${esc(item.place||"No location supplied")}</li>`).join("");
}

function filteredRecords(){
    const type=$("typeFilter").value;
    const status=$("statusFilter").value;
    const search=normalise($("searchInput").value);
    return state.resolved.filter(item=>{
        const typeMatch=type==="all"||item.type===type;
        const statusMatch=status==="all"||item.type!=="request"||normalise(item.status)===status;
        const searchMatch=!search||normalise(`${item.name} ${item.place} ${item.detail} ${item.status}`).includes(search);
        return typeMatch&&statusMatch&&searchMatch;
    });
}

function popup(item){
    return `<h3 class="popup-title">${esc(item.name)}</h3>
        <p class="popup-row"><b>Category:</b> ${esc(labels[item.type])}</p>
        <p class="popup-row"><b>Location:</b> ${esc(item.place||"Coordinates supplied")}</p>
        <p class="popup-row"><b>Status:</b> ${esc(title(item.status))}</p>
        <p class="popup-row">${esc(item.detail)}</p>`;
}

function coordinateLabel(item){
    const coords=item.actualCoords||item.coords;
    return Array.isArray(coords)?`${Number(coords[0]).toFixed(4)}, ${Number(coords[1]).toFixed(4)}`:"Unavailable";
}

function render(){
    const records=filteredRecords();
    if(markerLayer)markerLayer.clearLayers();
    const cards=[];
    for(const item of records){
        if(markerLayer){
            const marker=L.marker(item.coords,{icon:markerIcon(item.type)}).bindPopup(popup(item));
            marker.itemId=`${item.type}:${item.id}`;
            marker.addTo(markerLayer);
        }
        cards.push(`<button class="location-card" data-type="${esc(item.type)}" data-id="${esc(item.id)}">
            <span class="location-card-top"><strong>${esc(item.name)}</strong><span class="tag ${item.type}">${esc(labels[item.type])}</span></span>
            <span class="location-card-row"><b>Location</b><span>${esc(item.place||"Coordinates supplied")}</span></span>
            <span class="location-card-row"><b>Status</b><span>${esc(title(item.status))}</span></span>
            <span class="location-card-row"><b>Details</b><span>${esc(item.detail||"No additional details")}</span></span>
            <span class="location-card-row coordinates"><b>Coordinates</b><span>${esc(coordinateLabel(item))}</span></span>
        </button>`);
    }
    $("locationList").innerHTML=cards.join("");
    $("visibleCount").textContent=records.length;
    $("locationEmpty").classList.toggle("hidden",records.length>0);
}

function fitVisible(){
    const records=filteredRecords();
    if(!records.length)return showMessage("There are no visible markers to fit.","error");
    if(!map)return showMessage("The map library is unavailable. Refresh after checking your internet connection.","error");
    showMessage("");
    const bounds=L.latLngBounds(records.map(item=>item.coords));
    map.fitBounds(bounds.pad(.16),{maxZoom:14});
}

function startListeners(){
    const listen=(name,key,filter=items=>items)=>unsubscribers.push(onSnapshot(collection(db,name),snapshot=>{
        state[key]=filter(snapshot.docs.map(item=>({id:item.id,...item.data()})));
        scheduleRebuild();
    },error=>{console.error(error);showMessage(`The ${name} map data could not be loaded. Check Firestore rules.`,"error")}));
    listen("disasters","disasters");
    listen("requests","requests");
    listen("hospitalResources","hospitalResources");
    listen("distributionPoints","points");
    listen("users","hospitals",items=>items.filter(item=>normalise(item.role)==="hospital"));
}

async function verifyAdmin(user){
    const snapshot=await getDoc(doc(db,"users",user.uid));
    if(!snapshot.exists())throw new Error("Administrator profile was not found.");
    const role=normalise(snapshot.data().role);
    if(!["admin","authority"].includes(role))throw new Error("Only administrators can access the live map.");
}

$("typeFilter").addEventListener("change",render);
$("statusFilter").addEventListener("change",render);
$("searchInput").addEventListener("input",render);
$("fitMapButton").addEventListener("click",fitVisible);
$("toggleUnmappedButton").addEventListener("click",()=>{
    $("unmappedList").classList.toggle("hidden");
    $("toggleUnmappedButton").textContent=$("unmappedList").classList.contains("hidden")?"Show records":"Hide records";
});
$("locationList").addEventListener("click",event=>{
    const card=event.target.closest("[data-id]");
    if(!card)return;
    const item=state.resolved.find(entry=>entry.id===card.dataset.id&&entry.type===card.dataset.type);
    if(!item||!map)return;
    map.setView(item.coords,14);
    markerLayer.eachLayer(marker=>{if(marker.itemId===`${item.type}:${item.id}`)marker.openPopup()});
});
$("logoutButton").addEventListener("click",async()=>{
    unsubscribers.forEach(stop=>stop());
    await signOut(auth);
    location.replace("admin-login.html");
});

initialiseMap();
onAuthStateChanged(auth,async user=>{
    if(!user)return location.replace("admin-login.html");
    try{await verifyAdmin(user);startListeners()}
    catch(error){showMessage(error.message,"error");setTimeout(()=>location.replace("admin-login.html"),1400)}
});
window.addEventListener("beforeunload",()=>unsubscribers.forEach(stop=>stop()));
