/* eslint-disable @typescript-eslint/no-explicit-any */
import Promise, { PromiseState } from './Promise';

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

export class ProgressPromise extends Promise {
    private _arrProgress: ProgressObj[] = [];

    constructor(exacutor: Executor) {
        super(exacutor);
    }

    public then(
        onFulfilled?: OnFulfilled | null,
        onRejected?: OnRejected | null,
        onProgress?: OnProgress | null
    ): ProgressPromise {
        const currentPromise = new ProgressPromise(
            (resolve: (reason?: any) => void, reject: (reason?: any) => void, progress: (data?: any) => void): void => {
                this.thenWrapper((): ProgressPromise => currentPromise, resolve, reject, onFulfilled, onRejected);
                //super.then(onFulfilled, onRejected).then(resolve, reject);
                this._arrProgress.push({
                    onProgress,
                    progress,
                });
            }
        );
        return currentPromise;
    }

    protected init(exacutor: Executor, resolve: any, reject: any): void {
        exacutor(resolve, reject, this._progress.bind(this));
    }

    private _progress(data: any): void {
        if (this.state === PromiseState.PENDING) {
            setTimeout((): void => {
                this._arrProgress.forEach((progressObj: ProgressObj): void => {
                    if (typeof progressObj.onProgress === 'function') {
                        progressObj.onProgress(data);
                    }
                    if (typeof progressObj.progress === 'function') {
                        progressObj.progress(data);
                    }
                });
            });
        }
    }
}

export default ProgressPromise;
