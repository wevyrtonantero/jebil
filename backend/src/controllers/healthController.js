function getHealth(_req, res) {
  res.status(200).json({
    status: "ok",
    service: "jebil-backend",
  });
}

module.exports = {
  getHealth,
};
