declare module "graphqurl" {
    export interface Options {
        endpoint: string;
        query: string;
        variables?: any;
        headers?: any;
    }

    export interface Response {
        data: any;
        loading: boolean;
        networkStatus: number;
        stale: boolean;
    }

    export function query(options: Options): Promise<Response>;
}
