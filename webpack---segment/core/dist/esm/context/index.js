import {
    v4 as uuid
} from '@lukeed/uuid';
import {
    dset
} from 'dset';
import {
    CoreLogger
} from '../logger';
import {
    NullStats
} from '../stats';
var ContextCancelation = /** @class */ (function() {
    function ContextCancelation(options) {
        var _a, _b, _c;
        this.retry = (_a = options.retry) !== null && _a !== void 0 ? _a : true;
        this.type = (_b = options.type) !== null && _b !== void 0 ? _b : 'plugin Error';
        this.reason = (_c = options.reason) !== null && _c !== void 0 ? _c : '';
    }
    return ContextCancelation;
}());
export {
    ContextCancelation
};
var CoreContext = /** @class */ (function() {
    function CoreContext(event, id, stats, logger) {
        if (id === void 0) {
            id = uuid();
        }
        if (stats === void 0) {
            stats = new NullStats();
        }
        if (logger === void 0) {
            logger = new CoreLogger();
        }
        this.attempts = 0;
        this.event = event;
        this._id = id;
        this.logger = logger;
        this.stats = stats;
    }
    CoreContext.system = function() {
        // This should be overridden by the subclass to return an instance of the subclass.
    };
    CoreContext.prototype.isSame = function(other) {
        return other.id === this.id;
    };
    CoreContext.prototype.cancel = function(error) {
        if (error) {
            throw error;
        }
        throw new ContextCancelation({
            reason: 'Context Cancel'
        });
    };
    CoreContext.prototype.log = function(level, message, extras) {
        this.logger.log(level, message, extras);
    };
    Object.defineProperty(CoreContext.prototype, "id", {
        get: function() {
            return this._id;
        },
        enumerable: false,
        configurable: true
    });
    CoreContext.prototype.updateEvent = function(path, val) {
        var _a;
        // Don't allow integrations that are set to false to be overwritten with integration settings.
        if (path.split('.')[0] === 'integrations') {
            var integrationName = path.split('.')[1];
            if (((_a = this.event.integrations) === null || _a === void 0 ? void 0 : _a[integrationName]) === false) {
                return this.event;
            }
        }
        dset(this.event, path, val);
        return this.event;
    };
    CoreContext.prototype.failedDelivery = function() {
        return this._failedDelivery;
    };
    CoreContext.prototype.setFailedDelivery = function(options) {
        this._failedDelivery = options;
    };
    CoreContext.prototype.logs = function() {
        return this.logger.logs;
    };
    CoreContext.prototype.flush = function() {
        this.logger.flush();
        this.stats.flush();
    };
    CoreContext.prototype.toJSON = function() {
        return {
            id: this._id,
            event: this.event,
            logs: this.logger.logs,
            metrics: this.stats.metrics,
        };
    };
    return CoreContext;
}());
export {
    CoreContext
};
//# sourceMappingURL=index.js.map