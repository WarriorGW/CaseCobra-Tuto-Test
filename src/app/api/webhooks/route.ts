import { db } from "@/db"
import { stripe } from "@/lib/stripe"
import { create } from "domain"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = headers().get("stripe-signature")
    if (!signature) {
      return new Response("No signature", { status: 400 })
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    if (event.type === "checkout.session.completed") {
      if (!event.data.object.customer_details?.email) {
        throw new Error("No email found")
      }
      const session = event.data.object as Stripe.Checkout.Session

      const { userId, orderId } = session.metadata || {
        userId: null,
        orderId: null,
      }

      if (!userId || !orderId) {
        throw new Error("No user or order found")
      }

      const billingAddress = session.customer_details?.address
      const shippingAddress = session.shipping_details?.address

      await db.order.update({
        where: {
          id: orderId,
        },
        data: {
          isPaid: true,
          ShippingAddress: {
            create: {
              name: session.customer_details!.name!,
              city: shippingAddress!.city!,
              country: shippingAddress!.country!,
              postalCode: shippingAddress!.postal_code!,
              street: shippingAddress!.line1!,
              state: shippingAddress!.state!,
            },
          },
          BillingAddress: {
            create: {
              name: session.customer_details!.name!,
              city: billingAddress!.city!,
              country: billingAddress!.country!,
              postalCode: billingAddress!.postal_code!,
              street: billingAddress!.line1!,
              state: billingAddress!.state!,
            },
          },
        },
      })
    }

    return NextResponse.json({ result: event, ok: true })
  } catch (e) {
    console.error(e)
    //? On enterprise send this to sentry

    return NextResponse.json(
      { message: "Something went wrong", ok: false },
      { status: 500 }
    )
  }
}
