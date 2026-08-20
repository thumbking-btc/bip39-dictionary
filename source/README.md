# PWA 제작 소스

이 폴더만으로 BIP39 단어 학습 사전 PWA를 다시 만들고 검증할 수 있습니다.

## 구성

- `full/`: PWA의 기준이 되는 Full HTML v2.2
- `assets/`: 앱 아이콘과 공유 이미지의 제작 원본
- `templates/`: PWA 동작·화면에 사용하는 정적 소스
- `scripts/`: 사전 파생, 설치 안내 생성, GitHub Pages 조립, 무결성·개인정보 검사

## 다시 만들기

Node.js 22 이상에서 다음 명령을 실행합니다.

```bash
npm ci
npm run rebuild
```

검증된 배포 결과는 `build/site/`에 생성됩니다. GitHub Actions도 같은 명령과 같은 소스를 사용합니다.

Full HTML의 해시가 승인된 기준과 다르거나, 표제어 수·뜻 수·핵심 데이터·오프라인 구조·개인정보 검사가 어긋나면 빌드는 실패합니다.
