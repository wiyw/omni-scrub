// ── Pin Definitions ──────────────────────────────────────────────────────────
#define TRIG_PIN        9
#define ECHO_PIN        10
#define MOTOR_LEFT_PIN  5
#define MOTOR_RIGHT_PIN 6
#define SCRUB_PIN       7

// ── Shared state ─────────────────────────────────────────────────────────────
String mode = "auto";
int motorLeft = 0;
int motorRight = 0;
int scrubbing = 0;
int distance = 0;

// ── JSON Serial Communication ───────────────────────────────────────────────
void sendJSON(const char* key, int value) {
  Serial.print("{\"");
  Serial.print(key);
  Serial.print("\":");
  Serial.print(value);
  Serial.println("}");
}

void sendJSON(const char* key, const char* value) {
  Serial.print("{\"");
  Serial.print(key);
  Serial.print("\":\"");
  Serial.print(value);
  Serial.println("\"}");
}

void sendSensorData() {
  Serial.print("{\"distance\":");
  Serial.print(distance);
  Serial.print(",\"mode\":\"");
  Serial.print(mode);
  Serial.print("\",\"motorLeft\":");
  Serial.print(motorLeft);
  Serial.print(",\"motorRight\":");
  Serial.print(motorRight);
  Serial.print(",\"scrubbing\":");
  Serial.print(scrubbing);
  Serial.println("}");
}

// ── Functions ────────────────────────────────────────────────────────────────
int getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long dur = pulseIn(ECHO_PIN, HIGH, 30000);
  return (int)(dur * 0.034 / 2);
}

void setMode(String m) {
  mode = m;
}

void setMotors(int left, int right) {
  motorLeft = left;
  motorRight = right;
}

void setScrubbing(int state) {
  scrubbing = state;
}

void processCommand(String cmd) {
  cmd.trim();
  
  if (cmd.startsWith("SET_MODE:")) {
    setMode(cmd.substring(9));
    sendJSON("status", "ok");
  }
  else if (cmd.startsWith("SET_MOTORS:")) {
    int comma = cmd.indexOf(',');
    if (comma > 0) {
      int left = cmd.substring(11, comma).toInt();
      int right = cmd.substring(comma + 1).toInt();
      setMotors(left, right);
      sendJSON("status", "ok");
    }
  }
  else if (cmd.startsWith("SET_SCRUB:")) {
    setScrubbing(cmd.substring(10).toInt());
    sendJSON("status", "ok");
  }
  else if (cmd == "GET_SENSORS" || cmd == "SENSORS") {
    sendSensorData();
  }
  else if (cmd == "PING") {
    sendJSON("status", "pong");
  }
  else if (cmd == "HELLO") {
    sendJSON("device", "omniscrub");
    sendJSON("version", "1.0");
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(MOTOR_LEFT_PIN, OUTPUT);
  pinMode(MOTOR_RIGHT_PIN, OUTPUT);
  pinMode(SCRUB_PIN, OUTPUT);

  delay(1000);
  sendJSON("device", "omniscrub");
  sendJSON("status", "ready");
}

void loop() {
  distance = getDistance();

  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    if (cmd.length() > 0) {
      processCommand(cmd);
    }
  }

  if (mode == "auto") {
    if (distance > 20 && scrubbing) {
      analogWrite(MOTOR_LEFT_PIN, 150);
      analogWrite(MOTOR_RIGHT_PIN, 150);
    } else {
      analogWrite(MOTOR_LEFT_PIN, 0);
      analogWrite(MOTOR_RIGHT_PIN, 0);
    }
  }

  if (mode == "manual") {
    analogWrite(MOTOR_LEFT_PIN, constrain(motorLeft, 0, 255));
    analogWrite(MOTOR_RIGHT_PIN, constrain(motorRight, 0, 255));
  }

  digitalWrite(SCRUB_PIN, scrubbing ? HIGH : LOW);

  delay(100);
}
