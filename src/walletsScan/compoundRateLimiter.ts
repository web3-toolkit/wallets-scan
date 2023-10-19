import {RateLimiterOpts} from "limiter/src/RateLimiter";
import {createRequire} from "module";
const require = createRequire(import.meta.url);
const RateLimiter = require('limiter').RateLimiter;

export class CompoundRateLimiter {
    private readonly limiters: any;

    constructor(...limiterPropsList: RateLimiterOpts[]) {
        this.limiters = limiterPropsList.map(p => new RateLimiter(p));
    }

    public async removeTokens(count: number): Promise<number> {
        const limiterPromises: Promise<number>[] = [];
        for (const limiter of this.limiters) {
            limiterPromises.push(limiter.removeTokens(count));
        }
        return Promise
            .all(limiterPromises)
            .then(result => Math.min(...result))
    }
}