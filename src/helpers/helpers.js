// Helper function to validate a request using a Joi schema or similar
export function validateRequest(validator, data) {
  if (!validator || typeof validator.validate !== 'function') {
    throw new Error('Validator must have a validate function');
  }
  const { error } = validator.validate(data);
  return error || null;
}
