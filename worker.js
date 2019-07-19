self.onmessage= function (e) 
{
  var l = 4096;
  var wavHeader ="524946462420000057415645666d7420100000000100010044ac000088580100020010006461746100200000";
  var i16 = new Int16Array(l);
  while (l--) 
  {
    i16[l] = Math.min(1, e.data[l])*0x7FFF;
  }
  var uint8array = new Uint8Array(8236);
  for (var i = 0; i < 44; i++)
  {
     uint8array[i] = parseInt(wavHeader.substr(i*2,2), 16);
  }
  var srcU8 = new Uint8Array(i16.buffer, 0, 8192);
  uint8array.set(srcU8, 44);
  var ab = uint8array.buffer;
  postMessage (ab);
}
