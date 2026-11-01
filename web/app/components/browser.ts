// Firefox composites blurs, filters and redrawn canvases far more slowly than Chrome (homepage hero:
// 15 fps against 60 in the same scripted visit, the film 5 fps), so a few effects are lighter there.
// The same test as firefox.css, so the CSS and the JS always agree.
export const isFirefox = () => typeof CSS !== "undefined" && CSS.supports("-moz-appearance", "none");
