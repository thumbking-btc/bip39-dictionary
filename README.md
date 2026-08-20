# BIP39 단어 학습 사전

BIP39의 2,048개 단어를 한국어로 공부할 수 있도록 만든 오프라인 영한사전입니다.

## 바로 사용하기 — PWA

https://thumbking-btc.github.io/bip39-dictionary/

처음 열 때 사전을 기기에 저장하며, 이후에는 인터넷 연결 없이 검색·북마크·뜻 가리기 같은 핵심 기능을 사용할 수 있습니다. 발음 듣기는 기기나 브라우저의 음성 서비스에 따라 인터넷 연결을 사용할 수 있습니다.

[iPhone·Android 설치 방법 보기](https://thumbking-btc.github.io/bip39-dictionary/install.html)

## 파일로 내려받기

인터넷 연결 없이 파일 자체를 보관하고 열고 싶다면 [다운로드판 v2.1.1](https://github.com/thumbking-btc/bip39-dictionary/releases/tag/files-v2.1.1)에서 기기에 맞는 파일 하나를 받으세요.

| 파일 | 용도 |
| --- | --- |
| `BIP39_Dictionary_Full_v2.1.1.html` | PC와 일반 브라우저에서 검색·북마크·뜻 가리기·발음 듣기 등을 사용하는 완전 기능판 |
| `BIP39_Dictionary_Palma2_Offline_v2.1.1.html` | BOOX Palma2 기본 HTML 뷰어에서 별도 브라우저 없이 읽는 완전 오프라인판 |
| `BIP39_Dictionary_EPUB_v2.1.1.epub` | NeoReader 같은 전자책 앱에서 읽는 완전 오프라인 EPUB판 |

세 파일의 사전 내용은 같습니다. 사용하는 기기와 읽는 방식에 맞는 파일 하나만 받으면 됩니다.

## 안전하게 사용하기

이 사전은 BIP39 단어를 공부하고 이해하기 위한 자료입니다. 실제 복구문구를 입력하거나 붙여넣지 말고, 순서대로 검색하거나 북마크하지 마십시오.

PWA와 다운로드판의 핵심 사전 기능에는 별도의 서버·회원가입·추적 코드가 없습니다. 다만 발음 듣기는 기기나 브라우저가 제공하는 음성 서비스를 이용하므로 완전한 오프라인 작동을 보장하지 않습니다.

## 업데이트 내역

PWA판과 다운로드판은 같은 사전을 바탕으로 하지만 배포 방식이 달라 버전을 따로 기록합니다.

- PWA판: **v2.2**
- 다운로드판: **v2.1.1**
- 자세한 내용: [CHANGELOG.md](CHANGELOG.md)

## 제작 소스와 자동 배포

- 저장소 루트의 HTML·서비스 워커·아이콘은 현재 공개 중인 검증된 배포본입니다.
- `source/`에는 Full HTML 원본, PWA 제작 소스, 이미지 원본과 검증 도구가 들어 있습니다.
- `.github/workflows/deploy-pages.yml`은 같은 소스로 PWA를 다시 만들고 검증한 뒤 GitHub Pages에 배포합니다.

자세한 제작 방법은 [`source/README.md`](source/README.md)에 정리되어 있습니다.

## 제작

**엄지왕**

- X: [@thumbking0227](https://x.com/thumbking0227)
- Threads: [@thumb.ggul](https://www.threads.com/@thumb.ggul)
- Lightning: `thumbking@oksu.su`
