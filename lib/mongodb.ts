import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI as string

if (!uri) {
  throw new Error('MONGODB_URI 환경변수가 설정되지 않았습니다.')
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (process.env.NODE_ENV === 'development') {
  // 개발 환경: 핫 리로드 때 연결이 중복되지 않도록 global에 캐싱
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(uri)
  clientPromise = client.connect()
}

export default clientPromise
