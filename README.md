# 🛡 Disaster Resource Coordination System (DRCS)

## 📌 Overview

The **Disaster Resource Coordination System (DRCS)** is a centralized web-based platform developed to improve disaster response and resource coordination during emergencies such as floods, earthquakes, cyclones, landslides, and other disasters.

The system connects citizens, volunteers, NGOs, hospitals, and administrators through a unified platform to facilitate effective communication, emergency assistance, and resource management.

Its primary goal is to ensure that the right resources and assistance reach the right people at the right time.

## 🎯 Objectives

- Provide a centralized platform for disaster reporting and emergency assistance.
- Improve coordination between citizens, volunteers, NGOs, hospitals, and administrators.
- Enable efficient tracking and management of available relief resources.
- Facilitate timely volunteer task assignments and progress updates.
- Improve visibility of disaster situations and resource availability.

## ✨ Key Features

### 👤 Citizen Module
- User registration and login.
- Report disasters and emergency situations.
- Submit requests for emergency assistance.
- Track submitted requests.

### 🤝 Volunteer Module
- View assigned relief tasks.
- Access task-related information.
- Update task progress and completion status.

### 🏢 NGO Module
- Manage available relief resources.
- Update resource quantities and availability.
- Support disaster relief resource coordination.

### 🏥 Hospital Module
- Update hospital resource availability.
- Manage information about general beds and ICU beds.
- Track oxygen supplies, blood availability, and ambulances.

### 🛡 Administrator Module
- Monitor disaster reports and assistance requests.
- Coordinate emergency response activities.
- Assign volunteers to appropriate tasks.
- Manage and oversee platform activities.

## 🛠 Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend / Database | Firebase Cloud Firestore |
| Authentication | Firebase Authentication |
| Maps | Leaflet.js |
| Map Data | OpenStreetMap |
| Development Environment | Visual Studio Code |

## 🗺 Mapping Integration

DRCS integrates **Leaflet.js** with **OpenStreetMap** to display geographical information and disaster-related locations through interactive maps.

## ⚙️ System Architecture

The application follows a role-based architecture in which different users access functionalities according to their assigned roles.

Firebase Authentication handles user authentication, while Cloud Firestore stores and synchronizes application data.

## 🚀 Getting Started

### Prerequisites

- Visual Studio Code
- A modern web browser
- Firebase account
- Git

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Rithika2612/DRCS.git
   ```

2. Open the project folder in Visual Studio Code.

3. Configure your Firebase project and update the Firebase configuration in the application.

4. Ensure Firebase Authentication and Cloud Firestore are enabled.

5. Run the application using the VS Code Live Server extension or a local development server.

6. Open the application in your browser.

## 🔐 Security

- Firebase Authentication for user login and registration.
- Role-based access to application modules.
- Firestore Security Rules to control data access.

**Note:** Configure appropriate Firestore Security Rules before deploying the application. Never upload private credentials or service account keys to GitHub.

## 🔮 Future Enhancements

- Advanced disaster analytics and reporting.
- Improved geographical visualization of disaster-affected areas.
- Enhanced notification and emergency alert mechanisms.
- Additional resource allocation and monitoring capabilities.

