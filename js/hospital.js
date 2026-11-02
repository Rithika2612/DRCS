import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const elements = {
    hospitalName:$("hospitalName"),profileName:$("profileName"),profileInitial:$("profileInitial"),pageMessage:$("pageMessage"),
    logoutButton:$("logoutButton"),openCapacityButton:$("openCapacityButton"),availableBedsStat:$("availableBedsStat"),
    totalBedsText:$("totalBedsText"),availableIcuStat:$("availableIcuStat"),totalIcuText:$("totalIcuText"),oxygenStat:$("oxygenStat"),
    ambulanceStat:$("ambulanceStat"),lastUpdated:$("lastUpdated"),capacityForm:$("capacityForm"),totalBeds:$("totalBeds"),
    availableBeds:$("availableBeds"),totalIcu:$("totalIcu"),availableIcu:$("availableIcu"),oxygenUnits:$("oxygenUnits"),
    ambulances:$("ambulances"),saveCapacityButton:$("saveCapacityButton"),bloodForm:$("bloodForm"),bloodGrid:$("bloodGrid"),
    saveBloodButton:$("saveBloodButton"),resourceRequestForm:$("resourceRequestForm"),resourceType:$("resourceType"),
    resourceQuantity:$("resourceQuantity"),resourcePriority:$("resourcePriority"),resourceDetails:$("resourceDetails"),
    sendRequestButton:$("sendRequestButton"),profileForm:$("profileForm"),profileHospitalName:$("profileHospitalName"),
    registrationNumber:$("registrationNumber"),phone:$("phone"),emergencyPhone:$("emergencyPhone"),address:$("address"),
    city:$("city"),pincode:$("pincode"),saveProfileButton:$("saveProfileButton")
};
const bloodGroups=["A+","A-","B+","B-","AB+","AB-","O+","O-"];
let currentUser=null;
let profile={};
let resourceData={};
let unsubscribeResource=null;

function showMessage(message,type=""){
    elements.pageMessage.textContent=message;
    elements.pageMessage.className=`page-message ${type}`.trim();
    if(message&&type==="success") setTimeout(()=>showMessage(""),3500);
}
function number(value){const parsed=Number(value);return Number.isFinite(parsed)&&parsed>=0?parsed:0}
function formatDate(timestamp){
    if(!timestamp)return "Not updated yet";
    const date=typeof timestamp.toDate==="function"?timestamp.toDate():new Date(timestamp);
    return `Updated ${new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(date)}`;
}
function setBusy(button,busy,text){
    button.disabled=busy;
    button.textContent=busy?"Saving...":text;
}
function renderBloodInputs(){
    elements.bloodGrid.innerHTML=bloodGroups.map(group=>`<div class="blood-item"><label>${group}<input data-blood-group="${group}" type="number" min="0" value="0" aria-label="${group} blood units"></label></div>`).join("");
}
function fillProfile(){
    const name=profile.hospitalName||profile.name||currentUser.displayName||"Hospital";
    elements.hospitalName.textContent=name;
    elements.profileName.textContent=name;
    elements.profileInitial.textContent=name.charAt(0).toUpperCase();
    elements.profileHospitalName.value=name;
    elements.registrationNumber.value=profile.registrationNumber||"";
    elements.phone.value=profile.phone||"";
    elements.emergencyPhone.value=profile.emergencyPhone||"";
    elements.address.value=profile.address||profile.location||"";
    elements.city.value=profile.city||"";
    elements.pincode.value=profile.pincode||"";
}
function renderResources(data={}){
    resourceData=data;
    elements.totalBeds.value=number(data.totalBeds);
    elements.availableBeds.value=number(data.availableBeds);
    elements.totalIcu.value=number(data.totalIcu);
    elements.availableIcu.value=number(data.availableIcu);
    elements.oxygenUnits.value=number(data.oxygenUnits);
    elements.ambulances.value=number(data.ambulances);
    elements.availableBedsStat.textContent=number(data.availableBeds);
    elements.totalBedsText.textContent=`of ${number(data.totalBeds)} total beds`;
    elements.availableIcuStat.textContent=number(data.availableIcu);
    elements.totalIcuText.textContent=`of ${number(data.totalIcu)} ICU beds`;
    elements.oxygenStat.textContent=number(data.oxygenUnits);
    elements.ambulanceStat.textContent=number(data.ambulances);
    elements.lastUpdated.textContent=formatDate(data.updatedAt);
    const blood=data.bloodInventory||{};
    document.querySelectorAll("[data-blood-group]").forEach(input=>input.value=number(blood[input.dataset.bloodGroup]));
}
async function loadProfile(user){
    const snapshot=await getDoc(doc(db,"users",user.uid));
    if(!snapshot.exists())throw new Error("Hospital profile was not found in the users collection.");
    profile=snapshot.data();
    if(String(profile.role||"").toLowerCase()!=="hospital")throw new Error("This account does not have hospital access.");
    fillProfile();
    const name=profile.hospitalName||profile.name||user.displayName||"Hospital";
    localStorage.setItem("drcsUserProfile",JSON.stringify({uid:user.uid,name,role:profile.role||"hospital",email:profile.email||user.email||""}));
}
function listenToResources(){
    unsubscribeResource=onSnapshot(doc(db,"hospitalResources",currentUser.uid),snapshot=>{
        renderResources(snapshot.exists()?snapshot.data():{});
    },error=>{
        console.error(error);
        showMessage("Hospital resources could not be loaded. Publish the supplied Firestore rules.","error");
    });
}
function validCapacity(data){
    if(data.availableBeds>data.totalBeds){showMessage("Available beds cannot exceed total beds.","error");return false}
    if(data.availableIcu>data.totalIcu){showMessage("Available ICU beds cannot exceed total ICU beds.","error");return false}
    return true;
}
elements.capacityForm.addEventListener("submit",async event=>{
    event.preventDefault();
    const data={totalBeds:number(elements.totalBeds.value),availableBeds:number(elements.availableBeds.value),totalIcu:number(elements.totalIcu.value),availableIcu:number(elements.availableIcu.value),oxygenUnits:number(elements.oxygenUnits.value),ambulances:number(elements.ambulances.value)};
    if(!validCapacity(data))return;
    setBusy(elements.saveCapacityButton,true,"Save capacity update");
    try{
        await setDoc(doc(db,"hospitalResources",currentUser.uid),{
            ...data,hospitalId:currentUser.uid,hospitalName:profile.hospitalName||profile.name||"Hospital",
            city:profile.city||"",updatedBy:currentUser.uid,updatedAt:serverTimestamp()
        },{merge:true});
        showMessage("Hospital capacity updated successfully.","success");
    }catch(error){console.error(error);showMessage("Capacity could not be saved. Check Firestore rules.","error")}
    finally{setBusy(elements.saveCapacityButton,false,"Save capacity update")}
});
elements.bloodForm.addEventListener("submit",async event=>{
    event.preventDefault();
    const bloodInventory={};
    document.querySelectorAll("[data-blood-group]").forEach(input=>bloodInventory[input.dataset.bloodGroup]=number(input.value));
    setBusy(elements.saveBloodButton,true,"Save blood inventory");
    try{
        await setDoc(doc(db,"hospitalResources",currentUser.uid),{
            bloodInventory,hospitalId:currentUser.uid,hospitalName:profile.hospitalName||profile.name||"Hospital",updatedAt:serverTimestamp()
        },{merge:true});
        showMessage("Blood inventory updated successfully.","success");
    }catch(error){console.error(error);showMessage("Blood inventory could not be saved.","error")}
    finally{setBusy(elements.saveBloodButton,false,"Save blood inventory")}
});
elements.resourceRequestForm.addEventListener("submit",async event=>{
    event.preventDefault();
    const confirmed=confirm("Send this resource request to the DRCS administrator?");
    if(!confirmed)return;
    setBusy(elements.sendRequestButton,true,"Send emergency request");
    try{
        await addDoc(collection(db,"resourceRequests"),{
            hospitalId:currentUser.uid,hospitalName:profile.hospitalName||profile.name||"Hospital",
            hospitalEmail:currentUser.email||profile.email||"",resourceType:elements.resourceType.value,
            quantity:number(elements.resourceQuantity.value),priority:elements.resourcePriority.value,
            details:elements.resourceDetails.value.trim(),location:profile.address||profile.location||"",
            city:profile.city||"",status:"pending",createdAt:serverTimestamp(),updatedAt:serverTimestamp()
        });
        elements.resourceRequestForm.reset();
        showMessage("Emergency resource request sent to the administrator.","success");
    }catch(error){console.error(error);showMessage("The request could not be sent. Check Firestore rules.","error")}
    finally{setBusy(elements.sendRequestButton,false,"Send emergency request")}
});
elements.profileForm.addEventListener("submit",async event=>{
    event.preventDefault();
    const updates={
        hospitalName:elements.profileHospitalName.value.trim(),name:elements.profileHospitalName.value.trim(),
        registrationNumber:elements.registrationNumber.value.trim(),phone:elements.phone.value.trim(),
        emergencyPhone:elements.emergencyPhone.value.trim(),address:elements.address.value.trim(),
        city:elements.city.value.trim(),pincode:elements.pincode.value.trim(),updatedAt:serverTimestamp()
    };
    setBusy(elements.saveProfileButton,true,"Save hospital profile");
    try{
        await updateDoc(doc(db,"users",currentUser.uid),updates);
        profile={...profile,...updates};
        fillProfile();
        await setDoc(doc(db,"hospitalResources",currentUser.uid),{hospitalName:updates.hospitalName,city:updates.city,updatedAt:serverTimestamp()},{merge:true});
        showMessage("Hospital profile updated successfully.","success");
    }catch(error){console.error(error);showMessage("Hospital profile could not be updated.","error")}
    finally{setBusy(elements.saveProfileButton,false,"Save hospital profile")}
});
elements.openCapacityButton.addEventListener("click",()=>document.getElementById("capacity").scrollIntoView({behavior:"smooth"}));
elements.logoutButton.addEventListener("click",async()=>{
    try{if(unsubscribeResource)unsubscribeResource();await signOut(auth);localStorage.removeItem("drcsUserProfile");localStorage.removeItem("drcsCitizenName");location.replace("login.html")}
    catch(error){console.error(error);showMessage("Logout failed. Please try again.","error")}
});
function showCachedHospitalName(){
    try{
        const cachedProfile=JSON.parse(localStorage.getItem("drcsUserProfile")||"null");
        if(cachedProfile?.name&&cachedProfile.role==="hospital"){
            const name=cachedProfile.name.trim();
            elements.hospitalName.textContent=name;
            elements.profileName.textContent=name;
            elements.profileInitial.textContent=name.charAt(0).toUpperCase();
            elements.profileHospitalName.value=name;
        }
    }catch(error){console.warn("Could not read cached hospital profile:",error)}
}
showCachedHospitalName();
onAuthStateChanged(auth,async user=>{
    if(!user){location.replace("login.html");return}
    currentUser=user;
    try{await loadProfile(user);listenToResources()}
    catch(error){console.error(error);showMessage(error.message||"Hospital access could not be verified.","error");setTimeout(()=>location.replace("login.html"),1500)}
});
renderBloodInputs();
window.addEventListener("beforeunload",()=>{if(unsubscribeResource)unsubscribeResource()});
