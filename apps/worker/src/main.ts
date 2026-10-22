import { createConnection, createQueues, scheduleRecurring } from "./queues/index.js";

const connection = createConnection();
const queues = createQueues(connection);
await scheduleRecurring(queues);
console.log("worker: queues ready, recurring snapshot schedules registered");
// Job processors (BullMQ Worker instances) are attached here once the API/DB layer exists:
// snapshot -> buildSnapshot, deviation-engine -> evaluateProject, notifications -> deliverAll.
