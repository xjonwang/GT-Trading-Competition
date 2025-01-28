import socketManager from "../HelperClasses/SocketManager";
import orderBookInstance from "./OrderBook";
const URI = "http://localhost:8080";
class AsyncAPICall {
    path;
    dependency;
    data;
    promise;
    subscriber;
    counter;

    constructor(path, dependency) {
        this.path = path;
        this.data = null;
        this.promise = new Promise((resolve, reject) => { resolve(); });
        this.subscriber = (val) => {};
        this.dependency = dependency;
        this.counter = 0;
    }

    setSubscriber(callbackFunction) {
        this.subscriber = callbackFunction;
    }

    async requestHelper(form) {
        if (this.dependency !== null) {
            await this.dependency.promise;
            for (const key in this.dependency.data) {
                form[key] = this.dependency.data[key];
            }
        }
        let promise = fetch(URI + this.path, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(form)
            })
            .then((data) => {
                console.log(data.status);
                return data.json();
            });
        this.data = await promise;
        this.data = {...this.data, ...form };
        this.counter++;
        this.subscriber(this.counter);
    }

    request(form) {
        this.promise = this.requestHelper(form);
    }
}


let buildupObject = new AsyncAPICall("/buildup", null);
let teardownObject = new AsyncAPICall("/teardown", buildupObject);
let limitOrderObject = new AsyncAPICall("/limit_order", buildupObject);
let marketOrderObject = new AsyncAPICall("/market_order", buildupObject);

export function buildupHandler(data, subscriber) {
    // Set a subscriber that gets triggered when the API call completes
    buildupObject.setSubscriber((counter) => {
        subscriber(counter);

        // After the build-up is successful (counter > 0), connect to WebSocket
        if (counter > 0) {
            const buildupData = getBuildupData();
            console.log(buildupData)
            console.log(buildupObject)
            console.log(data)

            // Ensure buildupData contains the required sessionId and username
            if (buildupData && buildupData.username && buildupData.sessionToken && buildupData.orderBookData) {
                console.log("Build-up complete. Initiating WebSocket connection...");
                socketManager.connect(); // Initiates WebSocket connection
                orderBookInstance._createSortedMap(buildupData.orderBookData)
            } else {
                console.error("Buildup data is incomplete. Cannot connect to WebSocket.");
            }
        }
    });

    // Initiate the API call
    buildupObject.request(data);
}

export function teardownHandler(data, subscriber) {
    teardownObject.setSubscriber(subscriber);
    teardownObject.request(data);
}

export function limitOrderHandler(data, subscriber) {
    limitOrderObject.setSubscriber(subscriber);
    limitOrderObject.request(data);
}

export function marketOrderHandler(data, subscriber) {
    marketOrderObject.setSubscriber(subscriber);
    marketOrderObject.request(data);
}

export function getBuildupData() {
    return buildupObject.data;
}

export function getTeardownData() {
    return teardownObject.data;
}

export function getLimitOrderData() {
    return limitOrderObject.data;
}

export function getMarketOrderData() {
    return marketOrderObject.data;
}