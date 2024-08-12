
function createServerSdk() {
  const availableMethods = {
    staticjsindexjs__getData: async function getData() {   "use server";    console.log("blah");   return fetch("/path/to/internal/api"); }
  }
  async function invokeApi(identifier, args = []) {
    return availableMethods[identifier](...args);
  }

  return invokeApi;
}
    