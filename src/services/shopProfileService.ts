import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

export interface ShopDetail {
  shopName: string
  mobileNumber: string
  address: string
  alternateMobileNumber: string | null
}

export async function getShopDetails(): Promise<ShopDetail | null> {
  const snapshot = await getDoc(
    doc(db, 'shopDetails', 'shopDetail'),
  )

  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data()

  return {
    shopName: String(data.shopName ?? ''),
    mobileNumber: String(data.mobileNumber ?? ''),
    address: String(data.address ?? ''),
    alternateMobileNumber:
      data.alternateMobileNumber == null
        ? null
        : String(data.alternateMobileNumber),
  }
}
