// Version information for Web OS
// Update this when releasing new versions
window.WebOSVersion = {
  major: 0,
  minor: 2,
  patch: 0,
  toString() {
    return `${this.major}.${this.minor}.${this.patch}`;
  },
  getFull() {
    return this.toString();
  }
};
