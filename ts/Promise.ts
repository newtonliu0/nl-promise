/* eslint-disable @typescript-eslint/no-explicit-any */
type Executor = (resolve?: (value?: any) => void, reject?: (reason?: any) => void) => void;

interface CallbackObj {
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
    getPromise: () => Promise;
}

interface FulfillObj extends CallbackObj {
    onFulfilled?: (value: any) => any;
}
interface RejectObj extends CallbackObj {
    onRejected?: (reason: any) => any;
}
interface FinallyObj extends CallbackObj {
    onFinally?: () => void;
}

enum PromiseState {
    PENDING,
    FULFILLED,
    REJECTED,
}

const isThenable = (obj: any): boolean => Boolean(obj && obj.then && typeof obj.then === 'function');

const resolvePromise = (
    promise2: Promise,
    x: any,
    resolve: (value?: any) => void,
    reject: (reason?: any) => void
): void => {
    //PromiseA+ 2.3.1
    if (promise2 === x) {
        reject(new TypeError('Chaining cycle'));
    }
    if ((x && typeof x === 'object') || typeof x === 'function') {
        let used = false; //PromiseA+2.3.3.3.3 只能调用一次
        try {
            let then = x.then;
            if (typeof then === 'function') {
                //PromiseA+2.3.3
                then.call(
                    x,
                    (y: any): void => {
                        //PromiseA+2.3.3.1
                        if (used) return;
                        used = true;
                        resolvePromise(promise2, y, resolve, reject);
                    },
                    (reason: any): void => {
                        //PromiseA+2.3.3.2
                        if (used) return;
                        used = true;
                        reject(reason);
                    }
                );
            } else {
                //PromiseA+2.3.3.4
                if (used) return;
                used = true;
                resolve(x);
            }
        } catch (error) {
            //PromiseA+ 2.3.3.2
            if (used) return;
            used = true;
            reject(error);
        }
    } else {
        //PromiseA+ 2.3.3.4
        resolve(x);
    }
};

export class Promise {
    public static all(values: readonly Promise[]): Promise {
        const results: any[] = [];
        let num = 0;
        return new Promise((resolve, reject): void => {
            if (values.length === 0) {
                resolve(results);
            } else {
                values.forEach((promise: Promise, index: number): void => {
                    promise.then(
                        (value): void => {
                            results[index] = value;
                            if (++num === values.length) {
                                resolve(results);
                            }
                        },
                        (reason: any): void => {
                            reject(reason);
                        }
                    );
                });
            }
        });
    }

    public static race(values: readonly Promise[]): Promise {
        return new Promise((resolve, reject): void => {
            values.forEach((promise: Promise): void => {
                promise.then(
                    (value): void => {
                        resolve(value);
                    },
                    (reason): void => {
                        reject(reason);
                    }
                );
            });
        });
    }

    public static reject(value?: any): Promise {
        return new Promise((resolve, reject): void => {
            reject(value);
        });
    }

    public static resolve(value?: any): Promise {
        return new Promise((resolve, reject): void => {
            if (isThenable(value)) {
                value.then(resolve, reject);
            } else {
                resolve(value);
            }
        });
    }

    protected state: PromiseState = PromiseState.PENDING;
    private _fulfilled: FulfillObj[] = [];
    private _rejected: RejectObj[] = [];
    private _finally: FinallyObj[] = [];
    private _value: any = null;

    constructor(exacutor: Executor) {
        try {
            this.init(exacutor, this._resolve.bind(this), this._reject.bind(this));
            // exacutor(this._resolve.bind(this), this._reject.bind(this));
        } catch (error) {
            this._reject(error);
        }
    }

    protected init(exacutor: Executor, resolve: (value?: any) => void, reject: (reason?: any) => void): void {
        exacutor(resolve, reject);
    }

    public then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any): Promise {
        const currentPromise = new Promise((resolve, reject): void => {
            this.thenWrapper((): Promise => currentPromise, resolve, reject, onFulfilled, onRejected);
        });
        return currentPromise;
    }

    public catch(onRejected?: (reason: any) => any): Promise {
        return this.then(null, onRejected);
    }

    public finally(onFinally?: () => void): Promise {
        return this.then(
            (result: any): Promise => Promise.resolve(onFinally()).then((): any => result),
            (error: any): Promise =>
                Promise.resolve(onFinally()).then((): any => {
                    throw error;
                })
        );
    }

    protected thenWrapper(
        getCurrentPromise: () => Promise,
        resolve: (value?: any) => void,
        reject: (reason?: any) => void,
        onFulfilled?: (value: any) => any,
        onRejected?: (reason: any) => any
    ): void {
        if (this.state === PromiseState.FULFILLED) {
            setTimeout((): void => {
                try {
                    //PromiseA+ 2.2.7.1
                    if (typeof onFulfilled === 'function') {
                        let value = onFulfilled(this._value);
                        resolvePromise(getCurrentPromise(), value, resolve, reject);
                    } else {
                        resolve(this._value);
                    }
                } catch (e) {
                    //PromiseA+ 2.2.7.2
                    reject(e);
                }
            });
        } else if (this.state === PromiseState.REJECTED) {
            setTimeout((): void => {
                try {
                    if (typeof onRejected === 'function') {
                        const value = onRejected(this._value);
                        resolvePromise(getCurrentPromise(), value, resolve, reject);
                    } else {
                        reject(this._value);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        } else {
            this._fulfilled.push({
                onFulfilled,
                resolve,
                reject,
                getPromise: (): Promise => getCurrentPromise(),
            });
            this._rejected.push({
                onRejected,
                resolve,
                reject,
                getPromise: (): Promise => getCurrentPromise(),
            });
        }
    }

    private _resolve(value: any): void {
        if (this.state === PromiseState.PENDING) {
            this.state = PromiseState.FULFILLED;
            this._value = value;
            this._fulfilled.forEach((callbackObj: FulfillObj): void => {
                setTimeout((): void => {
                    if (typeof callbackObj.onFulfilled === 'function') {
                        try {
                            const newValue = callbackObj.onFulfilled(value);
                            resolvePromise(callbackObj.getPromise(), newValue, callbackObj.resolve, callbackObj.reject);
                        } catch (e) {
                            callbackObj.reject(e);
                        }
                    } else {
                        callbackObj.resolve(value);
                    }
                });
            });
            setTimeout((): void => {
                this._callFinally();
            });
        }
    }

    private _reject(reason: any): void {
        if (this.state === PromiseState.PENDING) {
            this.state = PromiseState.REJECTED;
            this._value = reason;
            setTimeout((): void => {
                this._rejected.forEach((callbackObj: RejectObj): void => {
                    if (typeof callbackObj.onRejected === 'function') {
                        try {
                            const newReason = callbackObj.onRejected(this._value);
                            resolvePromise(
                                callbackObj.getPromise(),
                                newReason,
                                callbackObj.resolve,
                                callbackObj.reject
                            );
                        } catch (e) {
                            callbackObj.reject(e);
                        }
                    } else {
                        callbackObj.reject(reason);
                    }
                });
            });

            setTimeout((): void => {
                this._callFinally();
            });
        }
    }

    private _callFinally(): void {
        this._finally.forEach((callbackObj: FinallyObj): void => {
            if (typeof callbackObj.onFinally === 'function') {
                callbackObj.onFinally();
            }
            if (this.state === PromiseState.FULFILLED) {
                callbackObj.resolve(this._value);
            } else {
                callbackObj.reject(this._value);
            }
        });
    }
}

export default Promise;
export { PromiseState };
