// The only file type that can be brought in from JSON is a snapshot.

export async function ingest_snapshot(c64, snapshot) {
  c64.runloop.stop();                // just out of caution
  c64.runloop.reset();               // just out of caution
  c64.runloop.deserialize(snapshot);
  c64.runloop.run();
}

