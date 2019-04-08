#include <ESP8266WiFi.h>
#define PubNub_BASE_CLIENT WiFiClient
#define PUBNUB_DEFINE_STRSPN_AND_STRNCASECMP
#include <ArduinoJson.h>
#include <PubNub.h>


//const char* ssid = "RMIT-Guest";
const char* ssid = "AndroidAP5DC5";
const char* password = "linhvo1234";


const char* pubkey = "pub-c-00782af2-d126-4201-b58f-42af72ec526e";
const char* subkey = "sub-c-bf5418c8-4fdf-11e9-aa90-a6f7447e8d57";
const char* subchannel = "LIGHT_CONTROL";

void setup() {
  /* For debugging, set to speed of your choice */
  Serial.begin(115200);
  pinMode(D7, OUTPUT);

  Serial.println("Connecting to WiFi..");
  WiFi.begin(ssid, password);
  //WiFi.begin(ssid);

  //try to connect the Wifi again when failed
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(100);
    yield();
  }

  Serial.println("Connected to the WiFi");

  //initialize PubNub connection
  PubNub.begin(pubkey, subkey);

  PubNub.set_uuid("c761a050-474d-4122-bd1e-157223d5d459");

  Serial.println("Successful PubNub set up");


}

void loop() {


  Serial.println("Waiting for a message.........");
  PubSubClient* client = PubNub.subscribe(subchannel);

  if (!client) {
    Serial.println("Error occurs");
    delay(1000);
    return;
  }

  String receivedMessage;
  SubscribeCracker ritz(client);

  while (!ritz.finished()) {
    ritz.get(receivedMessage);

    if (receivedMessage.length() > 0) {
      Serial.print("Received Message: ");
      Serial.println(receivedMessage);
      StaticJsonBuffer<200> jsonBuffer;
      JsonObject& payload = jsonBuffer.parseObject(receivedMessage);

      if (payload["topic"] == "TOPIC_LIGHT") {
        digitalWrite(D7, (payload["command"] == "on") ? HIGH : LOW);
        Serial.println((payload["command"] == "on") ? "HIGH" : "LOW");
      }
    }
  }

  client->stop();

  delay(1000);
}
