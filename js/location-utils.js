const TAMIL_NADU_COORDINATES = {
    chennai: [13.0827, 80.2707],
    coimbatore: [11.0168, 76.9558],
    madurai: [9.9252, 78.1198],
    tiruchirappalli: [10.7905, 78.7047],
    trichy: [10.7905, 78.7047],
    salem: [11.6643, 78.1460],
    tiruppur: [11.1085, 77.3411],
    erode: [11.3410, 77.7172],
    thanjavur: [10.7870, 79.1378],
    vellore: [12.9165, 79.1325],
    thoothukudi: [8.7642, 78.1348],
    tuticorin: [8.7642, 78.1348],
    kanchipuram: [12.8342, 79.7036],
    cuddalore: [11.7480, 79.7714],
    dindigul: [10.3673, 77.9803],
    nagercoil: [8.1833, 77.4119],
    hosur: [12.7409, 77.8253],
    pollachi: [10.6573, 77.0107],
    mettupalayam: [11.2996, 76.9349],
    gandhipuram: [11.0183, 76.9674],
    tambaram: [12.9249, 80.1000],
    avadi: [13.1067, 80.0970],
    koyambedu: [13.0694, 80.1948],
    velachery: [12.9815, 80.2180],
    perambur: [13.1210, 80.2326]
};

function knownCoordinates(location) {
    const value = String(location || "").trim().toLowerCase();
    for (const [place, coordinates] of Object.entries(TAMIL_NADU_COORDINATES)) {
        if (value.includes(place)) {
            return coordinates;
        }
    }
    return null;
}

async function geocodeLocation(location) {
    const known = knownCoordinates(location);
    if (known) {
        return known;
    }

    try {
        const query = `${location}, Tamil Nadu, India`;
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) {
            return null;
        }
        const result = (await response.json())[0];
        if (!result) {
            return null;
        }
        const latitude = Number(result.lat);
        const longitude = Number(result.lon);
        return Number.isFinite(latitude) && Number.isFinite(longitude)
            ? [latitude, longitude]
            : null;
    } catch (error) {
        console.warn("Typed location could not be converted to coordinates:", error);
        return null;
    }
}

function getBrowserCoordinates() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Location access is not supported by this browser."));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            position => resolve([
                position.coords.latitude,
                position.coords.longitude
            ]),
            () => reject(new Error("Location permission was denied or unavailable.")),
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
        );
    });
}

export { geocodeLocation, getBrowserCoordinates };
