'use client';

import { useState } from 'react';
import { Check, ChevronRight, User, Mail, Phone, MapPin, AlertCircle, Building2 } from 'lucide-react';
import { config } from '@/lib/config';

interface ProfileSetupWizardProps {
  currentUser: {
    name: string;
    email: string;
    department?: string | null;
    office_location?: string | null;
    job_title?: string | null;
  };
  onComplete: (data: ProfileData) => void;
}

interface ProfileData {
  department: string;
  office_location: string;
  employee_id?: string;
  manager_email: string;
  manager_name?: string;
  phone: string;
  pickup_address: string;
  pickup_notes?: string;
}

const STEPS = [
  { id: 1, title: 'User Info', icon: User },
  { id: 2, title: 'Work Info', icon: Building2 },
  { id: 3, title: 'Manager Email', icon: Mail },
  { id: 4, title: 'Contact Info', icon: Phone },
  { id: 5, title: 'Confirmation', icon: Check },
];

const ALLOWED_DOMAINS = [
  'intersnack.com.vn',
  'intersnack.com.sg',
  'intersnack.co.in',
];

export function ProfileSetupWizardEmail({ currentUser, onComplete }: ProfileSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 2: Work Info
  const [department, setDepartment] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  // Step 3: Manager Email
  const [managerEmail, setManagerEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [hasNoManager, setHasNoManager] = useState(false);

  // Step 4: Contact Info
  const [phone, setPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string): boolean => {
    // Basic email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Invalid email format');
      return false;
    }

    // Check domain
    const domain = email.split('@')[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      setEmailError(`Email must be from one of: ${ALLOWED_DOMAINS.join(', ')}`);
      return false;
    }

    // Can't be same as current user
    if (email.toLowerCase() === currentUser.email.toLowerCase()) {
      setEmailError('You cannot select yourself as manager');
      return false;
    }

    setEmailError('');
    return true;
  };

  const canProceedStep2 = department.trim() !== '' && officeLocation.trim() !== '';
  const canProceedStep3 = (hasNoManager || (managerEmail.trim() !== '' && !emailError));
  const canProceedStep4 = phone.trim() !== '' && pickupAddress.trim() !== '';

  const handleNext = () => {
    if (currentStep === 3 && !hasNoManager) {
      if (!validateEmail(managerEmail)) {
        return;
      }
    }
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!hasNoManager && !managerEmail) return;

    setIsSubmitting(true);
    try {
      const profileData: ProfileData = {
        department: department.trim(),
        office_location: officeLocation.trim(),
        employee_id: employeeId.trim() || undefined,
        manager_email: hasNoManager ? '' : managerEmail.trim().toLowerCase(),
        phone: phone.trim(),
        pickup_address: pickupAddress.trim(),
        pickup_notes: pickupNotes.trim(),
      };

      await onComplete(profileData);
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('An error occurred while saving profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Setup</h1>
          <p className="text-gray-600">Complete the following steps to use the system</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-rose-100">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                            ? 'bg-[#C00000] text-white ring-4 ring-rose-100'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                    >
                      {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <div className="text-center mt-2">
                      <div
                        className={`text-sm font-medium ${isActive ? 'text-[#C00000]' : isCompleted ? 'text-green-600' : 'text-gray-500'
                          }`}
                      >
                        Step {step.id}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">{step.title}</div>
                    </div>
                  </div>

                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-4 transition-all ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-rose-100">
          {/* Step 1: User Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Information</h2>
              <p className="text-gray-600 mb-6">
                This information is from your account and cannot be edited here.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-rose-50 rounded-lg border border-rose-100">
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <div className="mt-1 text-gray-900 font-medium">{currentUser.name}</div>
                </div>

                <div className="p-4 bg-rose-50 rounded-lg border border-rose-100">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <div className="mt-1 text-gray-900 font-medium">{currentUser.email}</div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-blue-800">
                  ℹ️ In the next step, you'll provide your work information (department, office, etc.)
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Work Info */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Work Information</h2>
              <p className="text-gray-600 mb-6">
                Please select your department and office location.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C00000] focus:border-transparent"
                >
                  <option value="">-- Select Department --</option>
                  {config.departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Office/Factory Location <span className="text-red-500">*</span>
                </label>
                <select
                  value={officeLocation}
                  onChange={(e) => setOfficeLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C00000] focus:border-transparent"
                >
                  <option value="">-- Select Location --</option>
                  {Object.values(config.locations).map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID (Optional)
                </label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="VN001234"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C00000] focus:border-transparent"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter your company employee ID if you have one
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Manager Email */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Manager Email</h2>
              <p className="text-gray-600 mb-6">
                Enter your direct manager's email address. They will receive a confirmation email.
              </p>

              {/* No Manager Checkbox */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasNoManager}
                    onChange={(e) => {
                      setHasNoManager(e.target.checked);
                      if (e.target.checked) {
                        setManagerEmail('');
                        setEmailError('');
                      }
                    }}
                    className="mt-1 h-4 w-4 text-[#C00000] border-gray-300 rounded focus:ring-[#C00000]"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">
                      I don't have a manager
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      ℹ️ If checked, your trip requests will be <strong>auto-approved</strong>.
                    </p>
                  </div>
                </label>
              </div>

              {!hasNoManager && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manager Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={managerEmail}
                    onChange={(e) => {
                      setManagerEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    onBlur={() => {
                      if (managerEmail) validateEmail(managerEmail);
                    }}
                    placeholder="yourmanager@intersnack.com.vn"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C00000] focus:border-transparent ${emailError ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {emailError && (
                    <div className="mt-2 flex items-start gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{emailError}</span>
                    </div>
                  )}
                  <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700 font-medium mb-2">Allowed email domains:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {ALLOWED_DOMAINS.map((domain) => (
                        <li key={domain}>✓ @{domain}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Your manager will receive an email to confirm this relationship before you can submit trips.
                    </p>
                  </div>
                </div>
              )}

              {hasNoManager && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✅ Your trip requests will be automatically approved without requiring manager approval.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Contact Info */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
              <p className="text-gray-600 mb-6">
                This information is used for trip coordination and pickup.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C00000] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="123 ABC Street, XYZ Ward, District 1, Ho Chi Minh City"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C00000] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  placeholder="Example: Near main gate, opposite supermarket..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C00000] focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirm Information</h2>
              <p className="text-gray-600 mb-6">Please review your information before completing.</p>

              <div className="space-y-4">
                <div className="p-4 bg-rose-50 rounded-lg border border-rose-100">
                  <h3 className="font-semibold text-gray-900 mb-3">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Full Name:</span>
                      <div className="font-medium">{currentUser.name}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <div className="font-medium">{currentUser.email}</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h3 className="font-semibold text-gray-900 mb-3">Work Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Department:</span>
                      <div className="font-medium">{department}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Office/Factory:</span>
                      <div className="font-medium">{config.locations[officeLocation as keyof typeof config.locations]?.name || officeLocation}</div>
                    </div>
                    {employeeId && (
                      <div>
                        <span className="text-gray-600">Employee ID:</span>
                        <div className="font-medium">{employeeId}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg border border-rose-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Manager</h3>
                  {hasNoManager ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800 font-medium">
                        ✅ No Manager (Auto-Approval Enabled)
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-3 border border-rose-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4 text-[#C00000]" />
                        <span className="font-medium">{managerEmail}</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        ⏳ Pending confirmation - Manager will receive email
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <div className="font-medium">{phone}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Pickup Address:</span>
                      <div className="font-medium">{pickupAddress}</div>
                    </div>
                    {pickupNotes && (
                      <div>
                        <span className="text-gray-600">Notes:</span>
                        <div className="font-medium">{pickupNotes}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  (currentStep === 2 && !canProceedStep2) ||
                  (currentStep === 3 && !canProceedStep3) ||
                  (currentStep === 4 && !canProceedStep4)
                }
                className="px-6 py-2 bg-[#C00000] text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Complete
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
