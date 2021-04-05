export const normalize = (val: any, max: any, min: any) =>
  (val - min) / (max - min);

export const randomNumberBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

// thanks to http://learningthreejs.com/blog/2013/08/02/how-to-do-a-procedural-city-in-100lines/
export const generateTexture = () => {
  const width = 32;
  const height = 64;

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d')!;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);

  const row = randomNumberBetween(1, 3);

  for (let y = 0; y < height; y += row) {
    for (let x = 0; x < width; x += 2) {
      const value = Math.floor(Math.random() * 64);

      if (Math.floor(Math.random() * 1000) % 10 === 0) {
        context.fillStyle =
          'rgb(' + [255, 255, (Math.random() * 255) | 0].join(',') + ')';
      } else {
        context.fillStyle = 'rgb(' + [value, value, value].join(',') + ')';
      }

      context.fillRect(x, y, row !== 2 ? 1 : 2, 1);
    }
  }

  const width2 = 512,
    height2 = 1024;
  const canvas2 = new OffscreenCanvas(width2, height2);
  const context2 = canvas2.getContext('2d')!;

  context2.imageSmoothingEnabled = false;
  context2.drawImage(canvas, 0, 0, width2, height2);

  return (canvas2 as unknown) as HTMLCanvasElement;
};
