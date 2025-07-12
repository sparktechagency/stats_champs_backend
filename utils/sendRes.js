
const sendResponse = (res, data) => {
  const responseData= {
    statusCode: data.statusCode || 200,
    success: data?.success,
    message: data?.message || null,
    data: data?.data || null,
    // eslint-disable-next-line no-undefined
    meta: data?.meta || null || undefined,
  };

  res.status(data?.statusCode).json(responseData);
};

export default sendResponse;