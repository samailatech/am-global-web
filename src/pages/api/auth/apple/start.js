export default async function handler(req, res) {
  return res.redirect('/login?authError=Apple%20sign-in%20is%20not%20configured%20yet.');
}
