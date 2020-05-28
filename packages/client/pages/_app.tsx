import { AppProps } from "next/app";
import { RecoilRoot } from "recoil";

// Tailwind CSS
import "./tailwind.css";

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <RecoilRoot>
            <Component {...pageProps} />
        </RecoilRoot>
    );
}

export default MyApp;
