export const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const validateRequired = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
};

export const validatePrice = (price: any): boolean => {
    const p = parseFloat(price);
    return !isNaN(p) && p >= 0;
};

export interface ValidationErrors {
    [key: string]: string;
}

export const validateProduct = (data: any): ValidationErrors => {
    const errors: ValidationErrors = {};
    if (!validateRequired(data.name)) errors.name = 'Product name is required';
    if (!validateRequired(data.price)) errors.price = 'Price is required';
    if (!validatePrice(data.price)) errors.price = 'Price must be a valid positive number';
    if (!validateRequired(data.styleCode)) errors.styleCode = 'Style code is required';
    if (!validateRequired(data.photo)) errors.photo = 'Preview image URL is required';
    return errors;
};

export const validateCategory = (data: any): ValidationErrors => {
    const errors: ValidationErrors = {};
    if (!validateRequired(data.name)) errors.name = 'Category name is required';
    if (!validateRequired(data.photo)) errors.photo = 'Category image URL is required';
    return errors;
};
