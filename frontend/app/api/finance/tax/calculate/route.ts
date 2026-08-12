import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/require-permission";
import { calculateTax } from "@/lib/platform/finance";
export async function POST(request:NextRequest){const auth=await getAuthenticatedUserContext();if(!auth)return NextResponse.json({error:"Authentication required."},{status:401});const b=await request.json().catch(()=>({}));return NextResponse.json(calculateTax(Number(b.amount??0),Number(b.rate??0),b.prices_include_tax===true));}
