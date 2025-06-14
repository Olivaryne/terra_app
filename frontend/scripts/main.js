const API_BASE = "https://dtqw9szt1eom5.cloudfront.net";
let token = "", map, marker, geocoder;

function switchView(view) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(view).classList.add('active');
    if (view === 'dashboard') loadProperties();
}

async function login() {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        username: document.getElementById("username").value,
        password: document.getElementById("password").value
        })
    });
    const data = await res.json();
    if (data.token && data.role === 'admin') {
        token = data.token;
        localStorage.setItem('jwt', token);
        switchView("register");
        document.getElementById("navBar").classList.add("active");
    } else {
        document.getElementById("loginMsg").innerText = "Invalid credentials";
    }
}

document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const username = email.split('@')[0];
    const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    document.getElementById('regStatus').textContent = res.ok ? "Account created!" : data.message || "Failed.";
});

function logout() {
    token = "";
    localStorage.removeItem('jwt');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById("loginSection").classList.add("active");
}

async function submitProperty() {
    const formData = new FormData();
    formData.append("propertyName", document.getElementById("propertyName").value);
    formData.append("propertyType", document.getElementById("propertyType").value);
    formData.append("address", document.getElementById("address").value);
    formData.append("latitude", document.getElementById("latitude").value);
    formData.append("longitude", document.getElementById("longitude").value);
    const file = document.getElementById("docUpload").files[0];
    if (file) formData.append("document", file);
    else formData.append("documentUrl", document.getElementById("documentUrl").value);

    const res = await fetch(`${API_BASE}/api/properties`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: formData
    });
    const data = await res.json();
    document.getElementById("formMsg").textContent = data.id ? "Property registered!" : data.error || "Failed.";
}

async function loadProperties() {
    const res = await fetch(`${API_BASE}/api/properties`, {
        headers: { Authorization: "Bearer " + token }
    });
    const { data } = await res.json();
    renderGroupedDashboard(groupBySubmitter(data));
}

function groupBySubmitter(properties) {
    const grouped = {};
    properties.forEach(p => {
        const key = p.submittedBy || 'guest';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
    });
    return grouped;
}

function renderGroupedDashboard(grouped) {
    const container = document.getElementById('dashboardContent');
    container.innerHTML = '';
    for (const submitter in grouped) {
        const rows = grouped[submitter].map(p => `
        <tr class="${p.submittedBy === 'guest' ? 'row-guest' : 'row-admin'}">
            <td>${p.propertyName}</td>
            <td>${p.address}</td>
            <td>${p.latitude}, ${p.longitude}</td>
            <td>${p.submittedBy}</td>
        </tr>
        `).join('');
        container.innerHTML += `
        <h3>Submitted by: ${submitter}</h3>
        <table>
            <thead><tr><th>Name</th><th>Address</th><th>Coordinates</th><th>Submitted By</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        `;
    }
}

function initMap() {
    geocoder = new google.maps.Geocoder();
    const defaultPos = { lat: 6.5244, lng: 3.3792 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12, center: defaultPos
    });
    marker = new google.maps.Marker({ map: map, position: defaultPos });
    map.addListener("click", e => {
        marker.setPosition(e.latLng);
        updateLatLng(e.latLng);
        reverseGeocode(e.latLng);
    });
}

function geocodeAddress() {
    const address = document.getElementById('guestAddress').value;
    geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK') {
        const loc = results[0].geometry.location;
        map.setCenter(loc);
        marker.setPosition(loc);
        updateLatLng(loc);
        } else {
        alert("Geocode failed: " + status);
        }
    });
}

function reverseGeocode(latlng) {
    geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results[0]) {
        document.getElementById('guestAddress').value = results[0].formatted_address;
        }
    });
}

function updateLatLng(pos) {
    document.getElementById('lat').value = pos.lat();
    document.getElementById('lng').value = pos.lng();
}

function submitGuestLocation() {
    const payload = {
        propertyName: document.getElementById('guestPropertyName').value,
        address: document.getElementById('guestAddress').value,
        latitude: parseFloat(document.getElementById('lat').value),
        longitude: parseFloat(document.getElementById('lng').value)
    };

    fetch(`${API_BASE}/api/properties/guest-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
        alert("Location submitted");
        marker.setPosition({ lat: payload.latitude, lng: payload.longitude });
        } else {
        alert("Submission failed");
        }
    });
}

window.onload = initMap;
