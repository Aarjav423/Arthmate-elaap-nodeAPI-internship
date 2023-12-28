const { CognitoJwtVerifier } = require('aws-jwt-verify')

const verifyToken = (scope) => {

  return (req, res, next) => {
    const authorizationHeader = req.headers.authorization ?? '';
    if (!authorizationHeader) {
      return res.status(401).send({
        code : 401,
        message : 'Unauthorized. Invalid header'
      });
    }
    const token = authorizationHeader.replace('Bearer ','');
    let tokenPayload = token.substring(token.indexOf('.') + 1);
    tokenPayload = tokenPayload.substring(0,tokenPayload.indexOf('.'));
    tokenPayload = JSON.parse(Buffer.from(tokenPayload,'base64').toString('utf8'))
    if ('access' !== tokenPayload.token_use) {
      return res.status(401).send({
        code : 401,
        message : "Unauthorized. Invalid token use"
      });
    }
    if (tokenPayload.scope?.indexOf(scope) < 0) {
      return res.status(401).send({
        code : 401,
        message : "Unauthorized. Invalid scope"
      });
    }
    const iss = tokenPayload.iss ?? ''
    const userPoolId = iss.substring(iss.lastIndexOf('/') + 1)
    const clientId = tokenPayload.client_id
    const cognitoTokenVerifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse : 'access',
      clientId,
    });
    cognitoTokenVerifier.verify(token)
      .then(() => next())
      .catch(() => res.status(401).send({
        code : 401,
        message : "Unauthorized. Invalid token"
      }));
  }
}

module.exports = {
  verifyToken,
}