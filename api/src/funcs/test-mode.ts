function normalizeTestPhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/\D/g, "");
}

function isTestMessageAllowed(testModeEnabled: boolean, registeredNumber: boolean) {
  return !testModeEnabled || registeredNumber;
}

export {
  isTestMessageAllowed,
  normalizeTestPhoneNumber
};
