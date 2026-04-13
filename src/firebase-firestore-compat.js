/**
 * ⚠️ LEGACY SHIM - Lovetree Firestore Compatibility Layer
 * 
 * This redirects Firestore-style API calls to Neon/PostgreSQL via Netlify Functions.
 * DO NOT USE as primary entry point for new code.
 * 
 * This module intercepts firebase.firestore() calls and redirects them to
 * Neon/PostgreSQL via Netlify Functions.
 * 
 * Architecture:
 *   Client Code → firebase.firestore() → [This Compat Layer] → /api/firestore → Neon/Postgres
 * 
 * What happens here:
 *   - Firestore-style API (collection, doc, get, set, update, delete, where, orderBy, onSnapshot)
 *   - Converts to HTTP POST requests to Netlify Functions
 *   - Returns Firestore-style snapshots
 * 
 * What does NOT happen:
 *   - No actual Firestore database
 *   - No Firebase SDK for database operations
 *   - Data is stored in Neon PostgreSQL, not Firestore
 * 
 * Auth note: Firebase Auth IS used for login/session (real Firebase).
 * But database operations go through this layer to PostgreSQL.
 * 
 * For new code, use: /src/postgres-client-browser.js (browser) or /src/postgres-client.js (ES modules)
 */
(function () {
if (typeof window === 'undefined' || typeof firebase === 'undefined') {
  return;
}

    const API_ENDPOINT = '/api/firestore';
    const TIMESTAMP_KEYS = new Set([
        'createdAt',
        'updatedAt',
        'deletedAt',
        'lastLogin',
        'lastUpdated',
        'lastOpened',
        'forkedAt',
        'sourceLastUpdated'
    ]);

    function isPlainObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function createTimestampLike(isoString) {
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) return isoString;
        const seconds = Math.floor(date.getTime() / 1000);
        return {
            _seconds: seconds,
            seconds: seconds,
            toDate: function () {
                return new Date(isoString);
            },
            toMillis: function () {
                return date.getTime();
            },
            toJSON: function () {
                return isoString;
            }
        };
    }

    function reviveValue(value, keyHint) {
        if (Array.isArray(value)) {
            return value.map(function (item) { return reviveValue(item, keyHint); });
        }

        if (isPlainObject(value)) {
            const next = {};
            Object.keys(value).forEach(function (key) {
                next[key] = reviveValue(value[key], key);
            });
            return next;
        }

        if (typeof value === 'string' && TIMESTAMP_KEYS.has(String(keyHint || ''))) {
            return createTimestampLike(value);
        }

        return value;
    }

    function serializeValue(value) {
        if (Array.isArray(value)) {
            return value.map(serializeValue);
        }

        if (isPlainObject(value)) {
            if (value.__firestoreTransform === true) {
                return value;
            }

            const next = {};
            Object.keys(value).forEach(function (key) {
                next[key] = serializeValue(value[key]);
            });
            return next;
        }

        if (value && typeof value.toDate === 'function') {
            return value.toDate().toISOString();
        }

        return value;
    }

    async function getAuthToken() {
        try {
            if (!firebase.auth || !firebase.apps || !firebase.apps.length) return '';
            const auth = firebase.auth();
            if (!auth) return '';
            const user = firebase.auth().currentUser;
            if (!user || typeof user.getIdToken !== 'function') return '';
            return await user.getIdToken();
        } catch (e) {
            try {
                const message = String((e && (e.message || e.code)) || '');
                const invalidAuth = /USER_NOT_FOUND|user-not-found|invalid-user-token|token.*expired|user token/i.test(message);
                if (invalidAuth && firebase.auth && firebase.apps && firebase.apps.length) {
                    const auth = firebase.auth();
                    if (auth) auth.signOut().catch(function () {});
                    if (typeof window !== 'undefined' && typeof window.clearStaleFirebaseAuthState === 'function') {
                        window.clearStaleFirebaseAuthState();
                    }
                }
            } catch (ignored) {
            }
            return '';
        }
    }

    async function callFirestoreApi(payload) {
        const token = await getAuthToken();
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: Object.assign(
                { 'Content-Type': 'application/json' },
                token ? { Authorization: 'Bearer ' + token } : {}
            ),
            body: JSON.stringify(payload)
        });

        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            data = {};
        }

        if (!response.ok) {
            throw new Error(data && data.error ? data.error : '데이터를 불러올 수 없습니다');
        }

        return data;
    }

    function makeDocSnapshot(path, doc) {
        const id = path.split('/').filter(Boolean).slice(-1)[0] || '';
        const exists = !!(doc && doc.data);
        return {
            id: exists ? doc.id : id,
            exists: exists,
            ref: new DocumentReference(path),
            data: function () {
                return exists ? reviveValue(doc.data) : undefined;
            }
        };
    }

    function makeQuerySnapshot(path, docs) {
        const docSnapshots = (docs || []).map(function (doc) {
            return makeDocSnapshot(path + '/' + doc.id, doc);
        });
        return {
            docs: docSnapshots,
            empty: docSnapshots.length === 0,
            size: docSnapshots.length,
            forEach: function (callback) {
                docSnapshots.forEach(callback);
            }
        };
    }

    function cloneQueryParts(parts) {
        return {
            where: parts.where.slice(),
            orderBy: parts.orderBy.slice(),
            limit: parts.limit
        };
    }

    function CollectionReference(path, queryParts) {
        this.path = path;
        this._queryParts = queryParts || { where: [], orderBy: [], limit: null };
    }

    CollectionReference.prototype.doc = function (id) {
        const nextId = id || generateId();
        return new DocumentReference(this.path + '/' + nextId);
    };

    CollectionReference.prototype.add = async function (data) {
        const result = await callFirestoreApi({
            op: 'addDoc',
            path: this.path,
            data: serializeValue(data)
        });
        return new DocumentReference(this.path + '/' + result.doc.id);
    };

    CollectionReference.prototype.where = function (field, op, value) {
        const next = cloneQueryParts(this._queryParts);
        next.where.push({ field: field, op: op, value: serializeValue(value) });
        return new CollectionReference(this.path, next);
    };

    CollectionReference.prototype.orderBy = function (field, direction) {
        const next = cloneQueryParts(this._queryParts);
        next.orderBy.push({ field: field, direction: direction || 'asc' });
        return new CollectionReference(this.path, next);
    };

    CollectionReference.prototype.limit = function (value) {
        const next = cloneQueryParts(this._queryParts);
        next.limit = value;
        return new CollectionReference(this.path, next);
    };

    CollectionReference.prototype.get = async function () {
        const result = await callFirestoreApi({
            op: 'queryCollection',
            path: this.path,
            constraints: cloneQueryParts(this._queryParts)
        });
        return makeQuerySnapshot(this.path, result.docs || []);
    };

    CollectionReference.prototype.onSnapshot = function (callback, errorCallback) {
        return createPollingSubscription(this, callback, errorCallback);
    };

    function DocumentReference(path) {
        this.path = path;
        this.id = path.split('/').filter(Boolean).slice(-1)[0] || '';
    }

    DocumentReference.prototype.collection = function (name) {
        return new CollectionReference(this.path + '/' + name);
    };

    DocumentReference.prototype.get = async function () {
        const result = await callFirestoreApi({
            op: 'getDoc',
            path: this.path
        });
        return makeDocSnapshot(this.path, result.doc);
    };

    DocumentReference.prototype.set = async function (data, options) {
        await callFirestoreApi({
            op: 'setDoc',
            path: this.path,
            data: serializeValue(data),
            options: options || {}
        });
    };

    DocumentReference.prototype.update = async function (data) {
        await callFirestoreApi({
            op: 'updateDoc',
            path: this.path,
            data: serializeValue(data)
        });
    };

    DocumentReference.prototype.delete = async function () {
        await callFirestoreApi({
            op: 'deleteDoc',
            path: this.path
        });
    };

    DocumentReference.prototype.onSnapshot = function (callback, errorCallback) {
        return createPollingSubscription(this, callback, errorCallback);
    };

    function WriteBatch() {
        this._actions = [];
    }

    WriteBatch.prototype.set = function (ref, data, options) {
        this._actions.push({
            op: 'setDoc',
            path: ref.path,
            data: serializeValue(data),
            options: options || {}
        });
        return this;
    };

    WriteBatch.prototype.update = function (ref, data) {
        this._actions.push({
            op: 'updateDoc',
            path: ref.path,
            data: serializeValue(data)
        });
        return this;
    };

    WriteBatch.prototype.delete = function (ref) {
        this._actions.push({
            op: 'deleteDoc',
            path: ref.path
        });
        return this;
    };

    WriteBatch.prototype.commit = async function () {
        await callFirestoreApi({
            op: 'runTransaction',
            path: '__batch__',
            actions: this._actions.slice()
        });
    };

    function FirestoreCompat() {}

    FirestoreCompat.prototype.collection = function (name) {
        return new CollectionReference(name);
    };

    FirestoreCompat.prototype.batch = function () {
        return new WriteBatch();
    };

    FirestoreCompat.prototype.runTransaction = async function (updateFunction) {
        const actions = [];
        const tx = {
            get: async function (ref) {
                return ref.get();
            },
            set: function (ref, data, options) {
                actions.push({
                    op: 'setDoc',
                    path: ref.path,
                    data: serializeValue(data),
                    options: options || {}
                });
            },
            update: function (ref, data) {
                actions.push({
                    op: 'updateDoc',
                    path: ref.path,
                    data: serializeValue(data)
                });
            },
            delete: function (ref) {
                actions.push({
                    op: 'deleteDoc',
                    path: ref.path
                });
            }
        };

        const result = await updateFunction(tx);
        if (actions.length) {
            await callFirestoreApi({
                op: 'runTransaction',
                path: '__transaction__',
                actions: actions
            });
        }
        return result;
    };

    function createPollingSubscription(target, callback, errorCallback) {
        let active = true;
        let lastSignature = '';

        async function poll() {
            if (!active) return;
            try {
                const snapshot = await target.get();
                const signature = JSON.stringify(snapshot.docs
                    ? snapshot.docs.map(function (doc) { return [doc.id, doc.data()]; })
                    : [snapshot.id, snapshot.exists, snapshot.data()]);
                if (signature !== lastSignature) {
                    lastSignature = signature;
                    callback(snapshot);
                }
            } catch (error) {
                if (typeof errorCallback === 'function') errorCallback(error);
                else console.error('onSnapshot polling failed:', error);
            }
        }

        poll();
        const timer = window.setInterval(poll, 4000);
        return function unsubscribe() {
            active = false;
            window.clearInterval(timer);
        };
    }

    function generateId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    }

    const firestoreInstance = new FirestoreCompat();
    const firestoreFactory = function () {
        return firestoreInstance;
    };

    firestoreFactory.FieldValue = {
        serverTimestamp: function () {
            return { __firestoreTransform: true, type: 'serverTimestamp' };
        },
        increment: function (operand) {
            return { __firestoreTransform: true, type: 'increment', operand: Number(operand || 0) };
        },
        arrayUnion: function () {
            return {
                __firestoreTransform: true,
                type: 'arrayUnion',
                values: Array.prototype.slice.call(arguments).map(serializeValue)
            };
        },
        delete: function () {
            return { __firestoreTransform: true, type: 'delete' };
        }
    };

    firebase.firestore = firestoreFactory;

    if (typeof window !== 'undefined') {
        window.postgresDB = firestoreInstance;
    }
})();
