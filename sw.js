import CryptoJS  from 'crypto-js/md5';
const sampleQuery = {
    query: `
    query GetHumanQuery($id: String!) {
        human(input: {id: $id }) {
          id
        }
      }
    `,
    variables: {
        id: "jBWMVGjm50l5LGwepDoty"
    }
}
console.log('this is a test');

const hashQuery = (clientQuery) => {
    const hash = CryptoJS.MD5(JSON.stringify(clientQuery));
    return hash.toString(CryptoJS.enc.Utf8);
}

console.log(hashQuery(sampleQuery));
/*
{"query":"\n            query GetHumanQuery($id: String!) {\n                human(input: {id: $id }) {\n                  id\n                }\n              }\n            ","variables":{"id":"jBWMVGjm50l5LGwepDoty"}}
*/

//define a simple function that accepts one input which will be the client's query
//  within function invoke the md5 hashing function and return the result, which will be a string
