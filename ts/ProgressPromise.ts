/* eslint-disable @typescript-eslint/no-explicit-any */
// import Promise, { PromiseState } from './Promise';

type OnFulfilled = (value: any) => any;
type OnRejected = (reason: any) => any;
type OnProgress = (data?: any) => any;

type Executor = (
    resolve?: (value?: any) => void,
    reject?: (reason?: any) => void,
    progerss?: (data?: any) => void
) => void;

interface ProgressObj {
    onProgress?: OnProgress;
    progress: (data?: any) => void;
}

const store: { [key: string]: any } = {};
let index = 0;

export class ProgressPromise<T> extends Promise<T> {
    private progress: (data?: any) => void = null;
    private index: number;
    constructor(exacutor: Executor) {
        super((resolve: (value: T) => void, reject: (value: T) => void): void => {
            store[`resolve_${index}`] = resolve;
            store[`reject_${index}`] = reject;
        });
        exacutor(store[`resolve_${index}`], store[`reject_${index}`], (data?: any): void => {
            this.progress && this.progress(data);
        });
        this.index = index;
        store[`resolve_${index}`] = null;
        store[`reject_${index}`] = null;
        index++;
    }

    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
        onProgress?: (data: any) => any | undefined | null
    ): Promise<TResult1 | TResult2> {
        this.progress = onProgress;
        return super.then(onfulfilled, onrejected);
    }
}

export default ProgressPromise;
