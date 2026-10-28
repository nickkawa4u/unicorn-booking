/** @type {import('next').NextConfig} */
module.exports = {
  async rewrites() {
    return [
      { source: '/', destination: '/booking.html' },
      { source: '/admin', destination: '/admin.html' },
    ];
  },
};
