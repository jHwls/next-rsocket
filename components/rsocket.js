import * as React from "react";

import RSocketWebSocketClient from "rsocket-websocket-client";
import {
  toBuffer,
  BufferEncoders,
  MESSAGE_RSOCKET_COMPOSITE_METADATA,
  RSocketClient
} from "rsocket-core";
import {
  APPLICATION_JSON,
  encodeBearerAuthMetadata,
  encodeCompositeMetadata,
  encodeRoute,
  MESSAGE_RSOCKET_AUTHENTICATION,
  MESSAGE_RSOCKET_ROUTING
} from "rsocket-core/build";
import { Flowable } from "rsocket-flowable/build";

const wsUrl = process.env.NEXT_PUBLIC_URL;
const randomJwt = process.env.NEXT_PUBLIC_JWT;

const buffer = toBuffer(
  JSON.stringify({ action: "load", symbols: ["SPLK", "CSCO"] })
);

console.log(buffer);

function Test() {
  const [client, setClient] = React.useState(null);
  const [socket, setSocket] = React.useState(null);

  React.useEffect(() => {
    if (client == null) {
      const c = new RSocketClient({
        setup: {
          keepAlive: 5_000,
          lifetime: 864_000_000,
          dataMimeType: APPLICATION_JSON.string,
          metadataMimeType: MESSAGE_RSOCKET_COMPOSITE_METADATA.string
        },
        transport: new RSocketWebSocketClient(
          {
            url: wsUrl,
            debug: true
          },
          BufferEncoders
        )
      });
      setClient(c);
      c.connect().then(
        (socket) => {
          setSocket(socket);
          socket
            .requestChannel(
              Flowable.just({
                data: buffer,
                metadata: encodeCompositeMetadata([
                  [MESSAGE_RSOCKET_ROUTING, encodeRoute("iex")],
                  [
                    MESSAGE_RSOCKET_AUTHENTICATION,
                    encodeBearerAuthMetadata(randomJwt)
                  ]
                ])
              })
            )
            .subscribe({
              onComplete: () => console.log("complete"),
              onError: (error) => {
                if (
                  error &&
                  error.source &&
                  error.source.code === 513 &&
                  error.source.message.indexOf("Access token expired") > -1
                ) {
                  // TODO: re-authenticate
                }
                console.log(error);
              },
              onNext: (payload) => {
                console.log(payload);
                const json = payload.data.toString();
                console.log(json);
              },
              onSubscribe: (subscription) => {
                subscription.request(2147483647);
              }
            });
          console.log("composite connection succeeded!");
        },
        (error) => {
          console.log("composite initial connection failed", error);
        }
      );
      console.log("connecting!");
    }
  }, [client, socket]);

  if (socket != null && client != null) {
    return <div>Connected - see log!</div>;
  } else {
    return <div>Connecting!</div>;
  }
}

export default Test;
