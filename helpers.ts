export const normalize = (val: any, max: any, min: any) =>
  (val - min) / (max - min);

export const randomNumberBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

// thanks to http://learningthreejs.com/blog/2013/08/02/how-to-do-a-procedural-city-in-100lines/
export function generateTexture() {
  const canvas = window.OffscreenCanvas
    ? new OffscreenCanvas(32, 64)
    : document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  const canvas2 = window.OffscreenCanvas
    ? new OffscreenCanvas(512, 1024)
    : document.createElement('canvas');
  const context2 = canvas2.getContext('2d')!;

  const width = 32;
  const height = 64;
  const width2 = 512;
  const height2 = 1024;

  if (!window.OffscreenCanvas) {
    canvas.width = width;
    canvas.height = height;
    canvas2.width = width2;
    canvas2.height = height2;
  }

  (context as any).fillStyle = '#ffffff';
  (context as any).fillRect(0, 0, width, height);

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

  context2.imageSmoothingEnabled = false;
  context2.drawImage(canvas, 0, 0, width2, height2);

  return (canvas2 as unknown) as HTMLCanvasElement;
}
