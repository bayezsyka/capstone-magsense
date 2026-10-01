const Joi = require("joi");

const schemas = {
  // Schema for User Registration/Creation
  userRegistration: Joi.object({
    username: Joi.string().min(2).max(50).optional().allow(null, "").messages({
      "string.min": "Username minimal 2 karakter",
      "string.empty": "Username tidak boleh kosong"
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Format email tidak valid",
      "any.required": "Email wajib diisi"
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password minimal 6 karakter",
      "any.required": "Password wajib diisi"
    }),
    role: Joi.string().valid("Admin", "Pembudidaya", "Operator", "admin", "pembudidaya", "operator", "user").optional().default("pembudidaya"),
    tenant_id: Joi.string().uuid().optional().allow(null, ""),
    is_active: Joi.boolean().optional().default(true)
  }),

  // Schema for User Update (password is optional)
  userUpdate: Joi.object({
    username: Joi.string().min(2).max(50).optional().allow(null, "").messages({
      "string.min": "Username minimal 2 karakter",
      "string.empty": "Username tidak boleh kosong"
    }),
    email: Joi.string().email().optional().messages({
      "string.email": "Format email tidak valid"
    }),
    password: Joi.string().min(6).optional().allow(null, "").messages({
      "string.min": "Password minimal 6 karakter"
    }),
    role: Joi.string().valid("Admin", "Pembudidaya", "Operator", "admin", "pembudidaya", "operator", "user").optional(),
    tenant_id: Joi.string().uuid().optional().allow(null, ""),
    is_active: Joi.boolean().optional()
  }),

  // Schema for User Login
  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Schema for Automation Thresholds Update
  automationThreshold: Joi.object({
    id: Joi.alternatives().try(Joi.string().uuid(), Joi.number()).optional().allow(null, ""),
    tenant_id: Joi.alternatives().try(Joi.string().uuid(), Joi.number()).required(),
    floor_level: Joi.number().integer().required(),
    temp_min: Joi.number().required(),
    temp_max: Joi.number().required(),
    air_hum_min: Joi.number().required(),
    air_hum_max: Joi.number().required(),
    media_hum_min: Joi.number().optional().allow(null),
    media_hum_max: Joi.number().optional().allow(null)
  }),

  // Schema for Box creation
  boxCreation: Joi.object({
    tenant_id: Joi.string().uuid().required(),
    location_id: Joi.string().uuid().optional().allow(null, ""),
    name: Joi.string().optional().allow(null, ""),
    box_number: Joi.number().optional(),
    is_active: Joi.boolean().optional().default(true),
    status: Joi.string().valid("Active", "Maintenance", "Inactive").optional()
  })
};

const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: false });
    const valid = error == null;

    if (valid) {
      req[property] = value;
      next();
    } else {
      const { details } = error;
      const message = details.map(i => i.message).join(", ");
      console.error("Validation Error:", message);
      res.status(400).json({ error: message });
    }
  };
};

module.exports = {
  schemas,
  validate
};
