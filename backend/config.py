# Central Demo City Configuration: Jaipur, Rajasthan, India
import os

DEMO_CITY = os.getenv("DEMO_CITY", "Jaipur")
DEMO_STATE = os.getenv("DEMO_STATE", "Rajasthan")
DEMO_COUNTRY = os.getenv("DEMO_COUNTRY", "India")

# Default Jaipur City Coordinates (C-Scheme / MI Road)
JAIPUR_CENTER = {"lat": 26.9124, "lng": 75.7873}

# Default Demo Patient Location: Aarav Sharma (Malviya Nagar, Jaipur)
DEMO_PATIENT_LOCATION = {
    "name": "Aarav Sharma",
    "address": "B-12, Malviya Nagar, Near Gaurav Tower, Jaipur, Rajasthan",
    "lat": 26.8530,
    "lng": 75.8050,
    "landmark": "Near Gaurav Tower, Malviya Nagar"
}

# Designated Demo Driver: Raj Kumar in AMB-104 (ALS)
# Stationed ~1.5 km away along JLN Marg / Malviya Nagar
DEMO_DRIVER_LOCATION = {
    "driver_name": "Raj Kumar",
    "email": "raj.driver@demo.com",
    "ambulance_reg": "AMB-104",
    "ambulance_type": "ALS",
    "lat": 26.8650,
    "lng": 75.8120,
    "address": "JLN Marg, Near World Trade Park, Jaipur",
    "is_online": True
}

# Fictional / Demo Hospitals in Jaipur
JAIPUR_HOSPITALS = [
    {
        "name": "SMS Medical College & Hospital (Demo)",
        "address": "JLN Marg, Ashok Nagar, Jaipur, Rajasthan 302004",
        "lat": 26.8960,
        "lng": 75.8160,
        "phone": "+91 141 251 8888",
        "emergency_dept": True,
        "is_government": True,
        "departments": ["Emergency & Trauma", "Cardiology", "Neurology", "General Medicine"]
    },
    {
        "name": "Fortis Escorts Hospital Jaipur (Demo)",
        "address": "Jawaharlal Nehru Marg, Malviya Nagar, Jaipur, Rajasthan 302017",
        "lat": 26.8520,
        "lng": 75.8080,
        "phone": "+91 141 254 7000",
        "emergency_dept": True,
        "is_government": False,
        "departments": ["Cardiology", "Emergency Care", "Orthopedics", "Pulmonology"]
    },
    {
        "name": "Eternal Heart Care Centre (EHCC Demo)",
        "address": "Jawahar Circle, Near Airport, Jaipur, Rajasthan 302017",
        "lat": 26.8550,
        "lng": 75.8150,
        "phone": "+91 141 398 8888",
        "emergency_dept": True,
        "is_government": False,
        "departments": ["Cardiac Surgery", "Critical Care", "Interventional Cardiology"]
    },
    {
        "name": "Jaipur City Civil Hospital (Demo)",
        "address": "Station Road, C-Scheme, Jaipur, Rajasthan 302001",
        "lat": 26.9180,
        "lng": 75.7900,
        "phone": "+91 141 237 0000",
        "emergency_dept": True,
        "is_government": True,
        "departments": ["General OPD", "Trauma", "Pediatrics"]
    }
]

# Demo Ambulance Fleet in Jaipur
JAIPUR_AMBULANCES = [
    {
        "reg": "AMB-104",
        "type": "ALS",
        "status": "AVAILABLE",
        "driver_email": "raj.driver@demo.com",
        "driver_name": "Raj Kumar",
        "driver_phone": "+91 98290 12345",
        "lat": 26.8650,
        "lng": 75.8120,
        "location_name": "JLN Marg near WTP (1.5 km from Aarav)"
    },
    {
        "reg": "AMB-101",
        "type": "BASIC",
        "status": "AVAILABLE",
        "driver_email": "suresh.driver@demo.com",
        "driver_name": "Suresh Yadav",
        "driver_phone": "+91 98290 12346",
        "lat": 26.8720,
        "lng": 75.8200,
        "location_name": "Tonk Phatak, Jaipur (~2.8 km)"
    },
    {
        "reg": "AMB-102",
        "type": "ALS",
        "status": "AVAILABLE",
        "driver_email": "prakash.driver@demo.com",
        "driver_name": "Prakash Joshi",
        "driver_phone": "+91 98290 12347",
        "lat": 26.8850,
        "lng": 75.8100,
        "location_name": "Bapu Nagar, Jaipur (~3.7 km)"
    },
    {
        "reg": "AMB-103",
        "type": "ICU",
        "status": "AVAILABLE",
        "driver_email": "imran.driver@demo.com",
        "driver_name": "Imran Sheikh",
        "driver_phone": "+91 98290 12348",
        "lat": 26.8500,
        "lng": 75.8250,
        "location_name": "Jawahar Circle, Jaipur (~2.2 km)"
    },
    {
        "reg": "AMB-105",
        "type": "BASIC",
        "status": "AVAILABLE",
        "driver_email": "venkat.driver@demo.com",
        "driver_name": "Venkat Rao",
        "driver_phone": "+91 98290 12349",
        "lat": 26.9050,
        "lng": 75.7430,
        "location_name": "Vaishali Nagar, Jaipur (~9 km)"
    },
    {
        "reg": "AMB-106",
        "type": "BASIC",
        "status": "BUSY",
        "driver_email": "anil.driver@demo.com",
        "driver_name": "Anil Meena",
        "driver_phone": "+91 98290 12350",
        "lat": 26.8600,
        "lng": 75.7600,
        "location_name": "Mansarovar, Jaipur"
    },
    {
        "reg": "AMB-107",
        "type": "ICU",
        "status": "AVAILABLE",
        "driver_email": "ramesh.driver@demo.com",
        "driver_name": "Ramesh Gurjar",
        "driver_phone": "+91 98290 12351",
        "lat": 26.8980,
        "lng": 75.8280,
        "location_name": "Raja Park, Jaipur (~5.5 km)"
    },
    {
        "reg": "AMB-108",
        "type": "BASIC",
        "status": "OFFLINE",
        "driver_email": "sunil.driver@demo.com",
        "driver_name": "Sunil Sharma",
        "driver_phone": "+91 98290 12352",
        "lat": 26.8700,
        "lng": 75.7950,
        "location_name": "Tonk Road, Jaipur"
    }
]
