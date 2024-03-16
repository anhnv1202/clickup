import {
    CustomError
} from 'ts-custom-error';
export class IntegrationError extends CustomError {
    constructor(message, code, status) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
export class RetryableError extends CustomError {
    constructor(message = '', status = 500) {
        super(message);
        this.code = ErrorCodes.RETRYABLE_ERROR;
        this.status = status;
    }
}
export class InvalidAuthenticationError extends CustomError {
    constructor(message = '', code = ErrorCodes.INVALID_AUTHENTICATION) {
        super(message);
        this.status = 401;
        this.code = code;
    }
}
export class PayloadValidationError extends IntegrationError {
    constructor(message) {
        super(message, ErrorCodes.PAYLOAD_VALIDATION_FAILED, 400);
    }
}
export class APIError extends IntegrationError {
    constructor(message, status) {
        super(message, status.toString(), status);
    }
}
export class SelfTimeoutError extends IntegrationError {
    constructor(message) {
        super(message, ErrorCodes.SELF_TIMEOUT, 408);
    }
}
export var ErrorCodes;
(function(ErrorCodes) {
    ErrorCodes["INVALID_AUTHENTICATION"] = "INVALID_AUTHENTICATION";
    ErrorCodes["PAYLOAD_VALIDATION_FAILED"] = "PAYLOAD_VALIDATION_FAILED";
    ErrorCodes["INVALID_CURRENCY_CODE"] = "INVALID_CURRENCY_CODE";
    ErrorCodes["RETRYABLE_ERROR"] = "RETRYABLE_ERROR";
    ErrorCodes["REFRESH_TOKEN_EXPIRED"] = "REFRESH_TOKEN_EXPIRED";
    ErrorCodes["OAUTH_REFRESH_FAILED"] = "OAUTH_REFRESH_FAILED";
    ErrorCodes["SELF_TIMEOUT"] = "SELF_TIMEOUT";
})(ErrorCodes || (ErrorCodes = {}));
//# sourceMappingURL=errors.js.map