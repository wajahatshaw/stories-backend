export const isValidString = (str: any): boolean => {
  return str != null && typeof str === "string" && str.length > 0;
};

export const isValidEmail = (email: string): boolean => {
  return isValidString(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isNonEmptyArray = (arr: any): boolean => {
  return Array.isArray(arr) && arr.length > 0;
};

export const isValidNumber = (num: any): boolean => {
  return num != null && typeof num === "number" && num > 0;
};

