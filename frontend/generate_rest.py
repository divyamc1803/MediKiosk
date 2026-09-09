import os

base_dir = "/Users/divyam/.gemini/antigravity/scratch/medikiosk/frontend"

# List of missing components & pages from the user prompt
files_to_touch = [
  "src/components/ui/Select.tsx",
  "src/components/ui/Tabs.tsx",
  "src/components/ui/LoadingSpinner.tsx",
  "src/components/ui/EmptyState.tsx",
  "src/components/ui/StatusBadge.tsx",
  "src/components/ui/Modal.tsx",
  
  "src/components/shared/DoctorSidebar.tsx",
  "src/components/shared/EmergencyButton.tsx",
  "src/components/shared/LanguageSelector.tsx",
  "src/components/shared/ConsentForm.tsx",
  
  "src/pages/patient/PatientHome.tsx",
  "src/pages/patient/AIInterview.tsx",
  "src/pages/patient/DocumentUpload.tsx",
  "src/pages/patient/AmbulanceRequest.tsx",
  "src/pages/patient/PatientProfile.tsx",
  "src/pages/patient/MedicalTimeline.tsx",
  
  "src/pages/kiosk/KioskHome.tsx",
  "src/pages/kiosk/KioskInterview.tsx",
  
  "src/pages/doctor/DoctorDashboard.tsx",
  "src/pages/doctor/PatientQueue.tsx",
  "src/pages/doctor/PatientClinicalView.tsx",
  "src/pages/doctor/EmergencyAlerts.tsx",
  
  "src/pages/driver/DriverHome.tsx",
  "src/pages/driver/DriverTrip.tsx",
  
  "src/pages/hospital/HospitalDashboard.tsx",
  
  "src/pages/admin/AdminDashboard.tsx",
  
  "src/pages/demo/DemoSelector.tsx"
]

template = """import React from 'react';

export const {component_name} = () => (
  <div className="p-4">
    <h2 className="text-xl font-bold">{component_name}</h2>
    <p>Component implementation pending.</p>
  </div>
);
"""

for filepath in files_to_touch:
    full_path = os.path.join(base_dir, filepath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    basename = os.path.basename(filepath)
    comp_name = os.path.splitext(basename)[0]
    
    with open(full_path, "w") as f:
        f.write(template.format(component_name=comp_name))
print("Rest of files generated.")
