# longchess

Chess, but long - aka "Chong". Inspired by the following legendary photograph:

<center>
<img src="https://i.pinimg.com/736x/08/af/b3/08afb31e4d99fbd587f287b186fefe89.jpg" height="300" />
</center>

## Setup

### Dependencies

You really just need NodeJS to run this, though you will also need to set up port forwarding, find a cloud VM, or use a tunneling service like Ngrok
to make your instance available to others. Once this is in place, just do the following:

1. Clone this repository. `cd` into the resulting directory and install the package dependencies by running `npm install`.
2. You're basically almost done - you just need to set up the WebSocket client. That's not as hard as it sounds; go to `/public/javascripts/index.js`.
There should be a long list of global variables; find the one called `WS_URL`.
3. By default, `WS_URL = localhost:3000`; you'll want to change this to the address of whatever server you're running this on. It should be whatever address
other people would use to access your instance; for example, if your instance is accessible at "http://www.chong.com', you'd set `WS_URL = chong.com`.
4. You may also need to modify `WS_PROTOCOL` to `wss` or `ws` depending on whether your server is HTTPS or HTTP respectively.
