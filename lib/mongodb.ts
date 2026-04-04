import { MongoClient } from 'mongodb'

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    // throw 대신 rejected Promise 를 반환 → 모듈 import 시 crash 없음
    return Promise.reject(new Error('MONGODB_URI 환경변수가 설정되지 않았습니다.'))
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect()
    }
    return global._mongoClientPromise
  }

  return new MongoClient(uri).connect()
}

const clientPromise: Promise<MongoClient> = createClientPromise()

export default clientPromise
