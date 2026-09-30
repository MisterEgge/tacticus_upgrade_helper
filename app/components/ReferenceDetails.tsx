import type {ReactNode} from "react";

export default function ReferenceDetails({label="Planning details",children}:{label?:string;children:ReactNode})
{
 return <details className="referenceDetails"><summary>{label}</summary><div>{children}</div></details>;
}
