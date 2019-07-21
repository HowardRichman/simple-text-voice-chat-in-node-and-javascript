self.onmessage= function (e) 
{
	// The 44 byte wav header of a 4096 byte mono wav file should look like this:
	// 52 49 46 46 24 20 00 00 57 41 56 45 66 6d 74 20 10 00 00 00 01 00 01 00 44 ac 00 00 88 58 01 00 02 00 10 00 64 61 74 61 00 20 00 00
	var l = 4096;
	var i16 = new Int16Array(4118);
	while (l--) 
	{
		i16[l+22] = Math.min(1, e.data[l])*0x7FFF;
	}
	i16[21] = 0x0000;
	i16[20] = 0x2000;
	i16[19] = 0x6174;
	i16[18] = 0x6164;
	i16[17] = 0x0010;
	i16[16] = 0x0002;
	i16[15] = 0x0001;
	i16[14] = 0x5888;
	i16[13] = 0x0000;
	i16[12] = 0xac44;
	i16[11] = 0x0001;
	i16[10] = 0x0001;
	i16[9] = 0x0000;
	i16[8] = 0x0010;
	i16[7] = 0x2074;
	i16[6] = 0x6d66;
	i16[5] = 0x4556;
	i16[4] = 0x4157;
	i16[3] = 0x0000;
	i16[2] = 0x2024;
	i16[1] = 0x4646;
 	i16[0] = 0x4952;
	var ab = i16.buffer;
	postMessage (ab);
}
