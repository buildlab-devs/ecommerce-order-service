const { AppError } = require('../lib/errors');

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ');
      return next(new AppError(message, 400, 'VALIDATION_ERROR'));
    }

    req.validated = result.data;
    next();
  };
}

module.exports = { validate };
