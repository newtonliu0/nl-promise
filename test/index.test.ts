/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { expect } from 'chai';
import { ProgressPromise } from '../ts';

class TestProgressPromise extends ProgressPromise {
    public static defer: any;
    public static deferred: any;
}

TestProgressPromise.defer = TestProgressPromise.deferred = function(): void {
    let dfd: any = {};
    dfd.promise = new ProgressPromise((resolve, reject): void => {
        dfd.resolve = resolve;
        dfd.reject = reject;
    });
    return dfd;
};

describe('Promises/A+ Tests', function(): void {
    require('promises-aplus-tests').mocha(TestProgressPromise);
});

describe('Test Progress for ProgressPromises', function(): void {
    it('When the state of ProgressPromise is pendding progress can be called', (done): void => {
        new ProgressPromise((resolve, reject, progress): void => {
            if (progress) {
                progress(1);
            }
        }).then(null, null, (data): void => {
            expect(data).to.be.equal(1);
            done();
        });
    });

    it('When the status of progressprogress is pending, progress can be called multiple times', (done): void => {
        let count = 0;
        new ProgressPromise((resolve, reject, progress): void => {
            if (progress) {
                progress(1);
                progress(1);
                progress(1);
            }
        }).then(null, null, (): void => {
            count++;
        });
        setTimeout((): void => {
            expect(count).to.be.equal(3);
            done();
        }, 100);
    });

    it('When the state of ProgressPromise is fulfilled progress can not called', (done): void => {
        const arr: number[] = [];
        new ProgressPromise((resolve, reject, progress): void => {
            resolve && resolve(1);
            progress && progress(2);
        }).then(
            (result): void => {
                arr.push(result);
            },
            null,
            (data): void => {
                arr.push(data);
            }
        );
        setTimeout((): void => {
            expect(arr).to.be.deep.equal([1]);
            done();
        }, 100);
    });

    it('When the state of ProgressPromise is rejected progress can not called', (done): void => {
        const arr: number[] = [];
        new ProgressPromise((resolve, reject, progress): void => {
            reject && reject(1);
            progress && progress(2);
        })
            .then(null, null, (data): void => {
                arr.push(data);
            })
            .catch((error): void => {
                arr.push(error);
            });
        setTimeout((): void => {
            expect(arr).to.be.deep.equal([1]);
            done();
        }, 100);
    });
});
