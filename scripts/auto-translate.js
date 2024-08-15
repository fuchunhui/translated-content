import fs from "node:fs/promises";
import { fdir } from "fdir";
import fm from "front-matter";
import ora from "ora";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// zh-CN translation
const contentMap = {
  "## Instance properties": "## 实例属性",
  "## Instance methods": "## 实例方法",
  "## Events": "## 事件",
  "## Syntax": "## 语法",
  "### Parameters": "### 参数",
  "### Return value": "### 返回值",
  "### Exceptions": "### 异常",
  "## Value": "## 值",
  "## Event type": "## 事件类型",
  "## Examples": "## 示例",
  "## Example": "## 示例",
  "#### Result": "#### 结果",
  "### Results": "#### 结果",
  "## Specifications": "## 规范",
  "## Browser compatibility": "## 浏览器兼容性",
  "## See also": "## 参见",
  "/en-US/": "/zh-CN/",
};

const titleMap = {
  '"': "",
  ": ": "：",
  property: "属性",
  method: "方法",
  event: "事件",
};

const spinner = ora().start();

const main = async () => {
  const { argv } = yargs(hideBin(process.argv)).command(
    "$0 [files..]",
    "Check the given files for a autoTranslate front matter key",
    (yargs) => {
      yargs
        .positional("files", {
          describe:
            "The files to check (relative to the current working directory)",
          type: "string",
          array: true,
          default: ["./files/"],
        })
        .option("format", {
          alias: "f",
          describe: "The format to print results in",
          type: "string",
          default: "md",
          choices: ["md", "csv", "json"],
        });
    },
  );

  const files = [];

  spinner.text = "Crawling files...";

  for (const fp of argv.files) {
    const fstats = await fs.stat(fp);

    if (fstats.isDirectory()) {
      files.push(
        ...new fdir()
          .withBasePath()
          .filter((path) => path.endsWith(".md"))
          .crawl(fp)
          .sync(),
      );
    } else if (fstats.isFile()) {
      files.push(fp);
    }
  }

  for (const i in files) {
    const file = files[i];

    fs.readFile(file, "utf-8")
      .then((data) => {
        const content = fm(data);
        const { attributes, body } = content;

        let newBody = body;
        for (const key in contentMap) {
          newBody = newBody.replaceAll(key, contentMap[key]);
        }

        const {
          title,
          slug,
          l10n: { sourceCommit } = { sourceCommit: "" },
        } = attributes;

        let newTitle = title;
        for (const key in titleMap) {
          newTitle = newTitle.replaceAll(key, titleMap[key]);
        }

        const newHeader = [
          `title: ${newTitle}`,
          `slug: ${slug}`,
          `l10n:`,
          `  sourceCommit: ${sourceCommit}`,
        ].join("\n");
        const newContent = `---\n${newHeader}\n---\n\n${newBody}`;

        fs.writeFile(file, newContent, "utf-8");
      })
      .catch((e) => {
        spinner.fail(`${file}: ${e}`);
        spinner.start();
      });
  }

  spinner.stop();
};

await main();
