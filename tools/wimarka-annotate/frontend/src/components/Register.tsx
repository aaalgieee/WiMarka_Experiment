import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FileText, AlertCircle, Check, Loader2, UserCheck, Users } from 'lucide-react';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    preferred_language: '', // No default language selection
    languages: [] as string[], // Explicitly define as string array
    user_type: 'annotator', // New field for user type
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: User Type, 2: Personal Info, 3: Account Details, 4: Onboarding (for annotators)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle user type selection
  const handleUserTypeChange = (userType: string) => {
    setFormData({
      ...formData,
      user_type: userType,
    });
  };

  // Helper function to handle language selection
  const handleLanguageToggle = (languageId: string) => {
    const isSelected = formData.languages.includes(languageId);
    let newLanguages: string[];
    
    if (isSelected) {
      newLanguages = formData.languages.filter(l => l !== languageId);
    } else {
      newLanguages = [...formData.languages, languageId];
    }
    
    // Update preferred_language logic:
    // - If only one language is selected, that becomes the primary
    // - If removing a language and that was the primary, use the first remaining language (if any)
    // - If preferred_language is empty and languages are selected, set the first one as preferred
    let updatedPreferredLanguage = formData.preferred_language;
    
    if (newLanguages.length === 1) {
      // When only one language is selected, it automatically becomes the primary
      updatedPreferredLanguage = newLanguages[0];
    } else if (newLanguages.length > 0 && (isSelected && languageId === formData.preferred_language)) {
      // If removing the current primary language, set to the first available one
      updatedPreferredLanguage = newLanguages[0];
    } else if (newLanguages.length === 0) {
      // If no languages selected, clear the primary language
      updatedPreferredLanguage = '';
    }
    
    setFormData({
      ...formData,
      languages: newLanguages,
      preferred_language: updatedPreferredLanguage
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters long';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (formData.languages.length === 0) {
      errors.languages = 'Please select at least one language';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (currentStep === 1) {
      // Just move to next step after user type selection
      setCurrentStep(2);
      return;
    }
    
    if (currentStep === 2) {
      const basicInfoValid = formData.first_name.trim() && formData.last_name.trim() && formData.languages.length > 0;
      if (basicInfoValid) {
        setCurrentStep(3);
      } else {
        setError('Please complete all required fields before continuing');
      }
      return;
    }

    if (!validateForm()) {
      setError('Please correct the errors before submitting');
      return;
    }

    setIsLoading(true);

    try {
      // Remove the confirmPassword field as it's not needed for the API
      const registerData = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        preferred_language: formData.preferred_language,
        languages: formData.languages,
        is_evaluator: formData.user_type === 'evaluator'
      };
      await register(registerData);
      
      // Check if user is annotator and needs onboarding
      if (formData.user_type === 'annotator') {
        setNeedsOnboarding(true);
        setRegistrationSuccess(true);
        // Don't navigate immediately - show onboarding prompt
      } else {
        setRegistrationSuccess(true);
        // Redirect after a short delay to show success message
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message || 'Registration failed. Please try again.');
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        // Handle API error responses
        const apiError = error as { response?: { data?: { detail?: string } } };
        setError(apiError.response?.data?.detail || 'Registration failed. Please try again.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get error message for a field
  const getFieldError = (field: string): string | undefined => {
    return validationErrors[field];
  };

  // Function to check if a field has an error
  const hasError = (field: string): boolean => {
    return !!validationErrors[field];
  };

  // Get input field class based on validation state
  const getInputClass = (field: string): string => {
    return `input-field mt-1 w-full px-3 py-2 border ${hasError(field) 
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'} 
      rounded-md shadow-sm focus:outline-none focus:ring-1`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <div className="flex justify-center">
            <FileText className="h-12 w-12 text-primary-500" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        {/* Registration Progress */}
        <div className="mb-8">
          <div className="relative">
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div 
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500 transition-all"
                style={{ 
                  width: currentStep === 1 ? '33.33%' : 
                         currentStep === 2 ? '66.67%' : 
                         '100%' 
                }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span className={currentStep >= 1 ? "font-semibold text-primary-600" : ""}>User Type</span>
              <span className={currentStep >= 2 ? "font-semibold text-primary-600" : ""}>Personal Info</span>
              <span className={currentStep >= 3 ? "font-semibold text-primary-600" : ""}>Account Details</span>
              {formData.user_type === 'annotator' && (
                <span className={currentStep >= 4 ? "font-semibold text-primary-600" : ""}>Qualification</span>
              )}
            </div>
          </div>
        </div>

        {registrationSuccess ? (
          <div className="bg-green-50 border border-green-200 rounded-md p-6 text-center animate-fadeIn">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-medium text-green-800 mb-2">Registration successful!</h3>
              <p className="text-sm text-green-600 mb-4">
                Your account has been created successfully as a{' '}
                <span className="font-semibold">{formData.user_type}</span>.
              </p>
              
              {needsOnboarding ? (                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 w-full">
                    <div className="flex items-start">
                      <div className="rounded-full bg-blue-100 p-2 mr-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-blue-900 mb-1">
                          🎯 One More Step - Qualification Test
                        </h4>
                        <p className="text-sm text-blue-800 mb-3">
                          To ensure high-quality annotations, we'd like you to complete a brief 
                          qualification test. It's friendly and designed to help you succeed!
                        </p>
                        <div className="bg-blue-25 rounded-md p-3 mb-3">
                          <div className="flex items-center text-blue-700 text-xs mb-2">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            <span>Takes ~15 minutes</span>
                            <span className="w-2 h-2 bg-blue-400 rounded-full mx-2"></span>
                            <span>Friendly & supportive</span>
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mx-2"></span>
                            <span>Learning opportunity</span>
                          </div>
                          <p className="text-xs text-blue-600 italic">
                            💡 This helps us understand your current skills so we can provide better support!
                          </p>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => navigate('/onboarding-test')}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Start Qualification Test
                          </button>
                          <button
                            onClick={() => navigate('/')}
                            className="px-4 py-2 border border-blue-300 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-50 transition-colors"
                          >
                            Do It Later
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
              ) : (
                <>
                  <p className="text-gray-500 text-sm">Redirecting to login page...</p>
                  <div className="mt-4 w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 animate-pulse"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Choose your role
                  </label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div
                      onClick={() => handleUserTypeChange('annotator')}
                      className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                        formData.user_type === 'annotator'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <Users className={`h-6 w-6 ${
                            formData.user_type === 'annotator' ? 'text-primary-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="ml-3 flex-1">
                          <h3 className={`text-sm font-medium ${
                            formData.user_type === 'annotator' ? 'text-primary-900' : 'text-gray-900'
                          }`}>
                            Annotator
                          </h3>
                          <p className={`text-sm ${
                            formData.user_type === 'annotator' ? 'text-primary-700' : 'text-gray-500'
                          }`}>
                            Review and annotate machine translations for quality and accuracy.
                            <br />
                            <span className="text-xs italic mt-1 block">
                              ✨ Includes a friendly qualification test to ensure annotation quality and help you succeed!
                            </span>
                          </p>
                        </div>
                        {formData.user_type === 'annotator' && (
                          <Check className="h-5 w-5 text-primary-600" />
                        )}
                      </div>
                    </div>

                    <div
                      onClick={() => handleUserTypeChange('evaluator')}
                      className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                        formData.user_type === 'evaluator'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <UserCheck className={`h-6 w-6 ${
                            formData.user_type === 'evaluator' ? 'text-primary-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="ml-3 flex-1">
                          <h3 className={`text-sm font-medium ${
                            formData.user_type === 'evaluator' ? 'text-primary-900' : 'text-gray-900'
                          }`}>
                            Evaluator
                          </h3>
                          <p className={`text-sm ${
                            formData.user_type === 'evaluator' ? 'text-primary-700' : 'text-gray-500'
                          }`}>
                            Evaluate and review annotations made by other users for quality assurance.
                          </p>
                        </div>
                        {formData.user_type === 'evaluator' && (
                          <Check className="h-5 w-5 text-primary-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                      First name
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={handleChange}
                      className={getInputClass('first_name')}
                      placeholder="First name"
                    />
                    {hasError('first_name') && <p className="mt-1 text-sm text-red-600">{getFieldError('first_name')}</p>}
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                      Last name
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={handleChange}
                      className={getInputClass('last_name')}
                      placeholder="Last name"
                    />
                    {hasError('last_name') && <p className="mt-1 text-sm text-red-600">{getFieldError('last_name')}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language Proficiency
                  </label>
                  
                  <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium">Select languages you are proficient in:</h3>
                      <span className="text-xs bg-gray-200 text-gray-700 rounded-full px-2 py-1">
                        {formData.languages.length} selected
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {[
                        { id: 'tagalog', name: 'Tagalog' },
                        { id: 'cebuano', name: 'Cebuano' },
                        { id: 'ilocano', name: 'Ilocano' },
                        { id: 'hiligaynon', name: 'Hiligaynon' },
                        { id: 'bicolano', name: 'Bicolano' },
                        { id: 'waray', name: 'Waray' },
                        { id: 'pampangan', name: 'Pampangan' },
                        { id: 'pangasinan', name: 'Pangasinan' }
                      ].map((language) => (
                        <div
                          key={language.id}
                          onClick={() => handleLanguageToggle(language.id)}
                          className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-md cursor-pointer transition-all ${
                            formData.languages.includes(language.id)
                              ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-center">{language.name}</span>
                          {formData.languages.includes(language.id) && 
                            <Check className="h-4 w-4 flex-shrink-0" />
                          }
                        </div>
                      ))}
                    </div>
                    
                    {formData.languages.length >= 2 && (
                      <div className="mt-4 p-3 bg-white rounded-md border border-gray-200">
                        <h3 className="text-sm font-medium mb-2">Choose a primary language:</h3>
                        <div className="flex flex-wrap gap-2">
                          {formData.languages.map(lang => (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  preferred_language: lang
                                });
                              }}
                              className={`py-1.5 px-4 text-sm rounded-full ${
                                formData.preferred_language === lang
                                  ? 'bg-primary-100 text-primary-800 font-semibold border-2 border-primary-400'
                                  : 'bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {lang.charAt(0).toUpperCase() + lang.slice(1)}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          This will be your primary language for {formData.user_type === 'evaluator' ? 'evaluation' : 'translation'} work
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <p className="mt-2 text-sm text-gray-500">
                    Click to select languages you're proficient in. You must select at least one.
                    {formData.languages.length === 1 && " Your selection will be set as your primary language."}
                  </p>
                  {hasError('languages') && <p className="mt-1 text-sm text-red-600">{getFieldError('languages')}</p>}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4 animate-slideIn">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className={getInputClass('username')}
                    placeholder="Choose a username"
                  />
                  {hasError('username') && <p className="mt-1 text-sm text-red-600">{getFieldError('username')}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={getInputClass('email')}
                    placeholder="Enter your email"
                  />
                  {hasError('email') && <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={getInputClass('password')}
                    placeholder="Create a password"
                  />
                  {hasError('password') && <p className="mt-1 text-sm text-red-600">{getFieldError('password')}</p>}
                  {!hasError('password') && formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              formData.password.length < 6 ? 'bg-red-500 w-1/4' : 
                              formData.password.length < 8 ? 'bg-orange-500 w-2/4' : 
                              formData.password.length < 12 ? 'bg-yellow-500 w-3/4' : 
                              'bg-green-500 w-full'
                            }`}
                          ></div>
                        </div>
                        <span className="ml-2 text-xs font-medium">
                          {formData.password.length < 6 ? 'Very weak' : 
                          formData.password.length < 8 ? 'Weak' : 
                          formData.password.length < 12 ? 'Medium' : 
                          'Strong'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Use at least 8 characters with uppercase, lowercase, numbers and symbols for a stronger password
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={getInputClass('confirmPassword')}
                    placeholder="Confirm your password"
                  />
                  {hasError('confirmPassword') && <p className="mt-1 text-sm text-red-600">{getFieldError('confirmPassword')}</p>}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> 
                    <span className="animate-pulse">
                      {currentStep === 1 ? 'Processing...' : currentStep === 2 ? 'Saving personal info...' : 'Creating account...'}
                    </span>
                  </>
                ) : (
                  <>
                    {currentStep === 1 ? 'Continue to Personal Info' : currentStep === 2 ? 'Continue to Account Setup' : 'Create Account'}
                    {currentStep === 3 && <Check className="ml-2 h-4 w-4" />}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;
