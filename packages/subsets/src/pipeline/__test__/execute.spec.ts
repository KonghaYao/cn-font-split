import { expect, test } from "vitest";
import { Executor } from "../executor";
import { Context } from "../context";

test("Executor ", async () => {
    const exec = new Executor(
        {
            login(ctx) {
                expect(ctx.check("tag")).toBe(true);
                const { tag } = ctx.pick("tag");
                expect(tag).toBe(2019);
            },
            setNickname(ctx) {
                ctx.set("nickname", "konghayao");
            },
            logout(ctx) {
                const { nickname } = ctx.pick("nickname");
                expect(nickname).toBe("konghayao");
            },
        },
        new Context<{ tag: number; nickname: string }>({ tag: 2019 })
    );
    exec.defineOrder(["login", "setNickname", "logout"]);
    await exec.run();
});
